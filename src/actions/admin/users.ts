"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { revokeAllUserSessions } from "@/auth/session";
import { revokeRefreshFamiliesForUser } from "@/auth/refresh";
import {
  requestMeta,
  withAdminPermission,
  type AdminActionResult,
  type AdminMutationResult,
} from "@/actions/admin/_helpers";
import { PAGE_SIZE, REASON_MIN } from "@/domain/admin/constants";
import { adminAudit, ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";
import {
  assertNotLastAdmin,
  assertNotSelf,
  validateReason,
} from "@/domain/admin/user-lifecycle";

export async function listUsers(input: unknown): Promise<
  AdminActionResult<{
    items: Array<{
      id: string;
      email: string;
      name: string | null;
      role: string;
      status: string;
      lockedUntil: Date | null;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>
> {
  return withAdminPermission("admin:users:read", async () => {
    const parsed = z
      .object({
        q: z.string().optional(),
        role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]).optional(),
        status: z.enum(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"]).optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
      .safeParse(input);
    if (!parsed.success) throw new Error("VALIDATION_ERROR");
    const { q, role, status, page } = parsed.data;
    const where = {
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          lockedUntil: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total, page, pageSize: PAGE_SIZE };
  });
}

export async function getUser(userId: string): Promise<
  AdminActionResult<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    status: string;
    doctorApproval: string | null;
    lockedUntil: Date | null;
    failedLoginCount: number;
    createdAt: Date;
  } | null>
> {
  return withAdminPermission("admin:users:read", async () => {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        doctorApproval: true,
        lockedUntil: true,
        failedLoginCount: true,
        createdAt: true,
      },
    });
  });
}

async function changeStatus(
  input: unknown,
  status: "SUSPENDED" | "ACTIVE" | "DEACTIVATED",
  auditType: string,
): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:users:write");
    const parsed = z
      .object({ userId: z.string().min(1), reason: z.string().min(REASON_MIN).max(500) })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const reason = validateReason(parsed.data.reason);
    assertNotSelf(admin.id, parsed.data.userId);
    if (status !== "ACTIVE") await assertNotLastAdmin(parsed.data.userId);

    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { status },
    });
    if (status !== "ACTIVE") {
      await revokeAllUserSessions(parsed.data.userId);
      await revokeRefreshFamiliesForUser(parsed.data.userId);
    }
    await adminAudit({
      type: auditType,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: parsed.data.userId,
      meta: { status, reason },
      ...(await requestMeta()),
    });
    revalidatePath("/admin/users");
    return { ok: true, message: "Status updated." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    const { isAdminDomainError } = await import("@/domain/admin/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isAdminDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function suspendUser(input: unknown) {
  return changeStatus(input, "SUSPENDED", ADMIN_AUDIT_TYPES.userSuspend);
}

export async function reinstateUser(input: unknown) {
  return changeStatus(input, "ACTIVE", ADMIN_AUDIT_TYPES.userReinstate);
}

export async function deactivateUser(input: unknown) {
  return changeStatus(input, "DEACTIVATED", ADMIN_AUDIT_TYPES.userDeactivate);
}

export async function unlockUserAdmin(input: unknown): Promise<AdminMutationResult> {
  const { unlockUser } = await import("@/actions/auth/admin");
  return unlockUser(input);
}

export async function revokeUserSessions(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:users:write");
    const parsed = z.object({ userId: z.string().min(1) }).safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    await revokeAllUserSessions(parsed.data.userId);
    await revokeRefreshFamiliesForUser(parsed.data.userId);
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.userRevokeSessions,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: parsed.data.userId,
      ...(await requestMeta()),
    });
    return { ok: true, message: "Sessions revoked." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}
