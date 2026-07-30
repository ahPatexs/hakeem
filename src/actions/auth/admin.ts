"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/auth/guards";
import { createChallenge } from "@/auth/tokens";
import { sendAuthEmail } from "@/auth/email";
import { auditLog } from "@/auth/audit";
import { revokeAllUserSessions } from "@/auth/session";
import { revokeRefreshFamiliesForUser } from "@/auth/refresh";
import { hashIp } from "@/auth/rate-limit";
import { isAuthDomainError, AuthDomainError } from "@/auth/errors";
import { hashPassword, validatePasswordPolicy } from "@/auth/passwords";
import { randomBytes } from "crypto";

export type ActionResult =
  | { ok: true; message?: string; inviteToken?: string }
  | { ok: false; code: string };

async function meta() {
  const h = await headers();
  return {
    ipHash: hashIp(h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip")),
    userAgent: h.get("user-agent"),
  };
}

export async function createDoctorUser(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("admin:doctors:provision");
    const parsed = z
      .object({ email: z.string().email(), name: z.string().min(2).max(120) })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const email = parsed.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { ok: false, code: "VALIDATION_ERROR" };

    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        role: "DOCTOR",
        status: "PENDING_VERIFICATION",
        doctorApproval: "PENDING_APPROVAL",
        createdByAdminId: admin.id,
      },
    });
    await auditLog({
      type: "admin.doctor.create",
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: user.id,
      ...(await meta()),
    });
    return { ok: true, message: "Doctor created (pending approval)." };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "FORBIDDEN" };
  }
}

export async function approveDoctor(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("admin:doctors:approve");
    const parsed = z.object({ userId: z.string().min(1), locale: z.enum(["en", "ar"]).optional() }).safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

    const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!user || user.role !== "DOCTOR") return { ok: false, code: "VALIDATION_ERROR" };

    await prisma.user.update({
      where: { id: user.id },
      data: {
        doctorApproval: "APPROVED",
        status: "ACTIVE",
        emailVerified: user.emailVerified ?? new Date(),
        mustChangePassword: true,
      },
    });

    const { rawToken } = await createChallenge({
      email: user.email,
      kind: "INVITE_SET_PASSWORD",
      userId: user.id,
    });
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const locale = parsed.data.locale ?? "ar";
    const url = `${site}/${locale}/reset-password?token=${rawToken}&invite=1`;
    await sendAuthEmail({
      to: user.email,
      subject: "Your Hakeem doctor account is approved",
      text: `Set your password: ${url}`,
    });

    await auditLog({
      type: "admin.doctor.approve",
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: user.id,
      ...(await meta()),
    });
    return { ok: true, message: "Doctor approved. Invite sent.", inviteToken: rawToken };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "FORBIDDEN" };
  }
}

export async function rejectDoctor(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("admin:doctors:approve");
    const parsed = z
      .object({ userId: z.string().min(1), reason: z.string().min(2).max(500) })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const user = await prisma.user.update({
      where: { id: parsed.data.userId },
      data: {
        doctorApproval: "REJECTED",
        doctorRejectionReason: parsed.data.reason,
        status: "DEACTIVATED",
      },
    });
    await revokeAllUserSessions(user.id);
    await revokeRefreshFamiliesForUser(user.id);
    await auditLog({
      type: "admin.doctor.reject",
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: user.id,
      ...(await meta()),
    });
    return { ok: true, message: "Doctor rejected." };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "FORBIDDEN" };
  }
}

export async function setUserStatus(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("admin:users:write");
    const parsed = z
      .object({
        userId: z.string().min(1),
        status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

    const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target) return { ok: false, code: "VALIDATION_ERROR" };

    if (target.role === "ADMIN" && parsed.data.status !== "ACTIVE") {
      const activeAdmins = await prisma.user.count({
        where: { role: "ADMIN", status: "ACTIVE" },
      });
      if (activeAdmins <= 1) throw new AuthDomainError("LAST_ADMIN");
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { status: parsed.data.status },
    });
    if (parsed.data.status !== "ACTIVE") {
      await revokeAllUserSessions(target.id);
      await revokeRefreshFamiliesForUser(target.id);
    }
    await auditLog({
      type: "admin.user.status_change",
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: target.id,
      meta: { status: parsed.data.status },
      ...(await meta()),
    });
    return { ok: true, message: "Status updated." };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "FORBIDDEN" };
  }
}

export async function inviteAdmin(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("admin:users:write");
    const parsed = z
      .object({ email: z.string().email(), name: z.string().min(2), locale: z.enum(["en", "ar"]).optional() })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const email = parsed.data.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) {
      return { ok: false, code: "VALIDATION_ERROR" };
    }
    const temp = randomBytes(16).toString("hex") + "Aa1!";
    validatePasswordPolicy(temp, email);
    const passwordHash = await hashPassword(temp);
    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name,
        role: "ADMIN",
        status: "PENDING_VERIFICATION",
        passwordHash,
        mustChangePassword: true,
        createdByAdminId: admin.id,
      },
    });
    const { rawToken } = await createChallenge({
      email,
      kind: "EMAIL_VERIFY",
      userId: user.id,
    });
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const locale = parsed.data.locale ?? "ar";
    await sendAuthEmail({
      to: email,
      subject: "Hakeem administrator invite",
      text: `Verify: ${site}/${locale}/verify-email?token=${rawToken}`,
    });
    await auditLog({
      type: "admin.invite",
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: user.id,
      ...(await meta()),
    });
    return { ok: true, message: "Admin invited." };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "FORBIDDEN" };
  }
}

export async function assignRole(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("admin:users:write");
    const parsed = z
      .object({
        userId: z.string().min(1),
        role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

    const target = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
    if (!target) return { ok: false, code: "VALIDATION_ERROR" };

    if (target.role === "ADMIN" && parsed.data.role !== "ADMIN") {
      const activeAdmins = await prisma.user.count({
        where: { role: "ADMIN", status: "ACTIVE" },
      });
      if (activeAdmins <= 1) throw new AuthDomainError("LAST_ADMIN");
    }

    await prisma.user.update({
      where: { id: target.id },
      data: {
        role: parsed.data.role,
        doctorApproval:
          parsed.data.role === "DOCTOR"
            ? target.doctorApproval ?? "PENDING_APPROVAL"
            : null,
      },
    });
    await revokeAllUserSessions(target.id);
    await revokeRefreshFamiliesForUser(target.id);
    await auditLog({
      type: "admin.user.role_change",
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: target.id,
      meta: { from: target.role, to: parsed.data.role },
      ...(await meta()),
    });
    return { ok: true, message: "Role updated." };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "FORBIDDEN" };
  }
}

export async function unlockUser(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("admin:users:write");
    const parsed = z.object({ userId: z.string().min(1) }).safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { failedLoginCount: 0, lockedUntil: null },
    });
    await auditLog({
      type: "auth.unlock",
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: parsed.data.userId,
      ...(await meta()),
    });
    return { ok: true, message: "Account unlocked." };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "FORBIDDEN" };
  }
}
