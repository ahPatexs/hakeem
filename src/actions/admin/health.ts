"use server";

import { prisma } from "@/lib/prisma";
import type { HealthComponentKey } from "@prisma/client";
import { deriveOverallStatus, type HealthComponent } from "@/domain/admin/health";
import {
  pingEmailAdapter,
  pingSmsAdapter,
  pingStorageAdapter,
} from "@/lib/platform/health";
import {
  requestMeta,
  withAdminPermission,
  type AdminActionResult,
  type AdminMutationResult,
} from "@/actions/admin/_helpers";
import { adminAudit, ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";

async function checkDatabase(): Promise<HealthComponent> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { key: "DATABASE", ok: true, message: "Connected", latencyMs: Date.now() - start };
  } catch {
    return { key: "DATABASE", ok: false, message: "Connection failed", latencyMs: Date.now() - start };
  }
}

async function pingUrl(
  key: HealthComponentKey,
  label: string,
  url: string | undefined,
): Promise<HealthComponent> {
  const start = Date.now();
  if (!url) {
    return { key, ok: true, message: `${label} not configured`, latencyMs: 0 };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5_000);
    const res = await fetch(url, { method: "GET", signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    const ok = res.ok || res.status === 401 || res.status === 403;
    return {
      key,
      ok,
      message: ok ? `${label} reachable (${res.status})` : `${label} unhealthy (${res.status})`,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      key,
      ok: false,
      message: `${label} unreachable: ${error instanceof Error ? error.message : "error"}`,
      latencyMs: Date.now() - start,
    };
  }
}

async function checkApp(): Promise<HealthComponent> {
  const start = Date.now();
  // App process is healthy if this code path runs; avoid self-fetch recursion on /api/admin/health.
  return { key: "APP", ok: true, message: "Application process healthy", latencyMs: Date.now() - start };
}

export async function runHealthChecks(): Promise<HealthComponent[]> {
  const [db, app, payments, ai, tele, email, sms, storage] = await Promise.all([
    checkDatabase(),
    checkApp(),
    pingUrl("PAYMENTS", "Payments", process.env.PAYMENTS_HEALTH_URL ?? process.env.PAYMENT_PROVIDER_HEALTH_URL),
    pingUrl("AI", "AI services", process.env.AI_HEALTH_URL ?? process.env.OPENAI_BASE_URL),
    pingUrl(
      "TELEMEDICINE",
      "Telemedicine",
      process.env.TELEMEDICINE_HEALTH_URL ?? process.env.LIVEKIT_HEALTH_URL,
    ),
    pingEmailAdapter(),
    pingSmsAdapter(),
    pingStorageAdapter(),
  ]);

  const toComponent = (
    key: HealthComponentKey,
    ping: { ok: boolean; message: string; latencyMs: number },
  ): HealthComponent => ({
    key,
    ok: ping.ok,
    message: ping.message,
    latencyMs: ping.latencyMs,
  });

  return [
    db,
    app,
    payments,
    ai,
    tele,
    toComponent("EMAIL", email),
    toComponent("SMS", sms),
    toComponent("STORAGE", storage),
  ];
}

export async function refreshSystemHealth(): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:health:read");
    const components = await runHealthChecks();
    const overall = deriveOverallStatus(components);
    const prev = await prisma.systemHealthSnapshot.findFirst({ orderBy: { checkedAt: "desc" } });
    await prisma.systemHealthSnapshot.create({
      data: { overall, components: components as never },
    });
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.healthView,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      meta: { overall },
      ...(await requestMeta()),
    });
    if (prev && prev.overall !== overall && (overall === "DEGRADED" || overall === "DOWN")) {
      const { notifyAdmins } = await import("@/lib/admin/notify-admins");
      await notifyAdmins({
        category: "HEALTH",
        title: `Platform status: ${overall}`,
        body: `System health changed from ${prev.overall} to ${overall}.`,
        href: "/admin/health",
      });
    }
    return { ok: true, message: "Health refreshed." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function getSystemHealth(): Promise<
  AdminActionResult<{
    overall: string;
    checkedAt: string | null;
    components: HealthComponent[];
  }>
> {
  return withAdminPermission("admin:health:read", async () => {
    let snap = await prisma.systemHealthSnapshot.findFirst({ orderBy: { checkedAt: "desc" } });
    if (!snap) {
      const components = await runHealthChecks();
      snap = await prisma.systemHealthSnapshot.create({
        data: { overall: deriveOverallStatus(components), components: components as never },
      });
    }
    return {
      overall: snap.overall,
      checkedAt: snap.checkedAt.toISOString(),
      components: snap.components as HealthComponent[],
    };
  });
}
