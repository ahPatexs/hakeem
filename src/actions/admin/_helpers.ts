"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/auth/guards";
import { isAuthDomainError, AuthDomainError } from "@/auth/errors";
import { hashIp } from "@/auth/rate-limit";
import { auditLog } from "@/auth/audit";
import { isAdminDomainError, AdminDomainError } from "@/domain/admin/errors";
import type { Permission, SessionUser } from "@/auth/rbac";

export type AdminActionResult<T> = { ok: true; data: T } | { ok: false; code: string };
export type AdminMutationResult = { ok: true; message?: string } | { ok: false; code: string };

export async function requestMeta() {
  const h = await headers();
  return {
    ipHash: hashIp(h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip")),
    userAgent: h.get("user-agent"),
  };
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requirePermission("admin:portal:access");
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { status: true, role: true },
  });
  if (!row || row.role !== "ADMIN" || row.status !== "ACTIVE") {
    await auditLog({
      type: "admin.access.denied",
      outcome: "DENIED",
      actorUserId: user.id,
      ...(await requestMeta()),
    });
    throw new AuthDomainError("FORBIDDEN");
  }
  return user;
}

export async function requireAdminPermission(permission: Permission): Promise<SessionUser> {
  const user = await requirePermission(permission);
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { status: true, role: true },
  });
  if (!row || row.role !== "ADMIN" || row.status !== "ACTIVE") {
    await auditLog({
      type: "admin.access.denied",
      outcome: "DENIED",
      actorUserId: user.id,
      meta: { permission },
      ...(await requestMeta()),
    });
    throw new AuthDomainError("FORBIDDEN");
  }
  return user;
}

export async function withAdmin<T>(fn: (admin: SessionUser) => Promise<T>): Promise<AdminActionResult<T>> {
  try {
    const admin = await requireAdmin();
    const data = await fn(admin);
    return { ok: true, data };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isAdminDomainError(error)) return { ok: false, code: error.code };
    console.error("[admin action]", error);
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function withAdminPermission<T>(
  permission: Permission,
  fn: (admin: SessionUser) => Promise<T>,
): Promise<AdminActionResult<T>> {
  try {
    const admin = await requireAdminPermission(permission);
    const data = await fn(admin);
    return { ok: true, data };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isAdminDomainError(error)) return { ok: false, code: error.code };
    console.error("[admin action]", error);
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function withAdminMutation(
  permission: Permission,
  fn: (admin: SessionUser) => Promise<string | void>,
): Promise<AdminMutationResult> {
  try {
    const admin = await requireAdminPermission(permission);
    const message = await fn(admin);
    return { ok: true, message: message ?? undefined };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isAdminDomainError(error)) return { ok: false, code: error.code };
    console.error("[admin mutation]", error);
    return { ok: false, code: "UNKNOWN" };
  }
}

export const REASON_MIN = 10;
export const PAGE_SIZE = 20;
export const EXPORT_ROW_CAP = Number(process.env.ADMIN_EXPORT_ROW_CAP ?? 10_000);
