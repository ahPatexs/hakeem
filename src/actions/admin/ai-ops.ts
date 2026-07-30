"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PlatformSettingValueType } from "@prisma/client";
import {
  REASON_MIN,
  requestMeta,
  withAdminPermission,
  type AdminActionResult,
  type AdminMutationResult,
} from "@/actions/admin/_helpers";
import { adminAudit, ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";
import { getAllPlatformSettings } from "@/lib/admin/maintenance";
import { parseSettingValue, SETTING_KEYS } from "@/domain/admin/settings";
import { validateReason } from "@/domain/admin/user-lifecycle";
import { periodStart } from "@/lib/admin/dashboard";
import { periodToDays, type AnalyticsPeriod } from "@/domain/admin/analytics";

export async function getAiOpsSnapshot(): Promise<
  AdminActionResult<{
    patientMessages: number;
    doctorMessages: number;
    flaggedCount: number;
    settings: Array<{ key: string; value: string }>;
  }>
> {
  return withAdminPermission("admin:ai:ops", async () => {
    const since = periodStart(30);
    const [patientMessages, doctorMessages, flaggedCount, settings] = await Promise.all([
      prisma.aiMessage.count({ where: { createdAt: { gte: since } } }),
      prisma.doctorAiMessage.count({ where: { createdAt: { gte: since } } }),
      prisma.aiFlaggedConversation.count({ where: { reviewedAt: null } }),
      getAllPlatformSettings(),
    ]);
    return {
      patientMessages,
      doctorMessages,
      flaggedCount,
      settings: settings
        .filter((s) => s.key.startsWith("ai."))
        .map((s) => ({ key: s.key, value: s.value })),
    };
  });
}

export async function toggleAiSetting(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:ai:ops");
    const parsed = z.object({ key: z.string(), enabled: z.boolean() }).safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const before = await prisma.platformSetting.findUnique({ where: { key: parsed.data.key } });
    await prisma.platformSetting.upsert({
      where: { key: parsed.data.key },
      update: { value: String(parsed.data.enabled), updatedByUserId: admin.id },
      create: {
        key: parsed.data.key,
        valueType: PlatformSettingValueType.BOOLEAN,
        value: String(parsed.data.enabled),
        updatedByUserId: admin.id,
      },
    });
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.aiToggle,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      meta: { key: parsed.data.key, before: before?.value, after: String(parsed.data.enabled) },
      ...(await requestMeta()),
    });
    revalidatePath("/admin/ai");
    return { ok: true, message: "AI setting updated." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function disableUserAi(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:ai:ops");
    const parsed = z
      .object({ userId: z.string().min(1), reason: z.string().min(REASON_MIN).max(500) })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const reason = validateReason(parsed.data.reason);
    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: {
        aiDisabledAt: new Date(),
        aiDisabledReason: reason,
        aiDisabledByUserId: admin.id,
      },
    });
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.aiUserDisable,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: parsed.data.userId,
      meta: { reason },
      ...(await requestMeta()),
    });
    const { notifyAdmins } = await import("@/lib/admin/notify-admins");
    await notifyAdmins({
      category: "AI_GOVERNANCE",
      title: "User AI disabled",
      body: "An administrator disabled AI for a user account.",
      href: `/admin/users/${parsed.data.userId}`,
    });
    return { ok: true, message: "User AI disabled." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    const { isAdminDomainError } = await import("@/domain/admin/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isAdminDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function listFlaggedConversations(): Promise<
  AdminActionResult<
    Array<{ id: string; source: string; conversationId: string; reason: string; createdAt: Date }>
  >
> {
  return withAdminPermission("admin:ai:ops", async () =>
    prisma.aiFlaggedConversation.findMany({
      where: { reviewedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  );
}

export async function reviewFlaggedConversation(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:ai:ops");
    const parsed = z
      .object({ id: z.string().min(1), note: z.string().min(REASON_MIN).max(500) })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const note = validateReason(parsed.data.note);
    await prisma.aiFlaggedConversation.update({
      where: { id: parsed.data.id },
      data: { reviewedAt: new Date(), reviewedByUserId: admin.id, reviewNote: note },
    });
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.aiFlagReview,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      meta: { flagId: parsed.data.id, note },
      ...(await requestMeta()),
    });
    revalidatePath("/admin/ai");
    return { ok: true, message: "Flag reviewed." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function getPlatformSettings(): Promise<
  AdminActionResult<Array<{ key: string; value: string; valueType: string }>>
> {
  return withAdminPermission("admin:settings:write", async () => {
    const rows = await getAllPlatformSettings();
    return rows.map((r) => ({ key: r.key, value: r.value, valueType: r.valueType }));
  });
}

export async function updatePlatformSetting(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:settings:write");
    const parsed = z
      .object({
        key: z.enum(SETTING_KEYS),
        value: z.string(),
        valueType: z.nativeEnum(PlatformSettingValueType),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const value = parseSettingValue(parsed.data.valueType, parsed.data.value);
    const before = await prisma.platformSetting.findUnique({ where: { key: parsed.data.key } });
    await prisma.platformSetting.upsert({
      where: { key: parsed.data.key },
      update: { value, valueType: parsed.data.valueType, updatedByUserId: admin.id },
      create: {
        key: parsed.data.key,
        value,
        valueType: parsed.data.valueType,
        updatedByUserId: admin.id,
      },
    });
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.settingsChange,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      meta: { key: parsed.data.key, before: before?.value, after: value },
      ...(await requestMeta()),
    });
    revalidatePath("/admin/settings");
    return { ok: true, message: "Setting saved." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    const { isAdminDomainError } = await import("@/domain/admin/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isAdminDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function getAnalyticsSeries(input: unknown): Promise<
  AdminActionResult<{
    period: AnalyticsPeriod;
    users: number;
    doctors: number;
    appointments: number;
    revenueNetCents: number;
    aiMessages: number;
  }>
> {
  return withAdminPermission("admin:analytics:read", async () => {
    const parsed = z.object({ period: z.enum(["7d", "30d", "90d"]).default("30d") }).safeParse(input ?? {});
    if (!parsed.success) throw new Error("VALIDATION_ERROR");
    const since = periodStart(periodToDays(parsed.data.period));
    const [users, doctors, appointments, payments, aiMessages] = await Promise.all([
      prisma.user.count({ where: { role: "PATIENT", createdAt: { gte: since } } }),
      prisma.user.count({ where: { role: "DOCTOR", doctorApproval: "APPROVED", createdAt: { gte: since } } }),
      prisma.appointment.count({ where: { createdAt: { gte: since } } }),
      prisma.paymentObligation.findMany({
        where: { createdAt: { gte: since }, status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } },
        select: { amountCents: true, refundedAmountCents: true },
        take: 5000,
      }),
      prisma.aiMessage.count({ where: { createdAt: { gte: since } } }),
    ]);
    const gross = payments.reduce((s, p) => s + p.amountCents, 0);
    const refunds = payments.reduce((s, p) => s + p.refundedAmountCents, 0);
    return {
      period: parsed.data.period,
      users,
      doctors,
      appointments,
      revenueNetCents: gross - refunds,
      aiMessages,
    };
  });
}
