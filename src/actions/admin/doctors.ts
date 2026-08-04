"use server";

import {
  createDoctorUser as createDoctorUserAuth,
  approveDoctor as approveDoctorAuth,
  rejectDoctor as rejectDoctorAuth,
  type ActionResult,
} from "@/actions/auth/admin";

export async function createDoctorUser(input: unknown): Promise<ActionResult> {
  return createDoctorUserAuth(input);
}

export async function approveDoctor(input: unknown): Promise<ActionResult> {
  const result = await approveDoctorAuth(input);
  if (result.ok) {
    const { notifyAdmins } = await import("@/lib/admin/notify-admins");
    await notifyAdmins({
      category: "ADMIN_OPS",
      title: "Doctor approved",
      body: "A pending doctor application was approved.",
      href: "/admin/doctors?pending=1",
    });
  }
  return result;
}

export async function rejectDoctor(input: unknown): Promise<ActionResult> {
  const result = await rejectDoctorAuth(input);
  if (result.ok) {
    const { notifyAdmins } = await import("@/lib/admin/notify-admins");
    await notifyAdmins({
      category: "ADMIN_OPS",
      title: "Doctor rejected",
      body: "A pending doctor application was rejected.",
      href: "/admin/doctors",
    });
  }
  return result;
}

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
import { validateReason } from "@/domain/admin/user-lifecycle";
import { setDoctorBookable } from "@/domain/admin/doctor-approval";

export async function listDoctors(input: unknown): Promise<
  AdminActionResult<{
    items: Array<{
      id: string;
      email: string;
      name: string | null;
      status: string;
      doctorApproval: string | null;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>
> {
  return withAdminPermission("admin:doctors:approve", async () => {
    const parsed = z
      .object({
        pendingOnly: z.coerce.boolean().optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
      .safeParse(input ?? {});
    if (!parsed.success) throw new Error("VALIDATION_ERROR");
    const where = {
      role: "DOCTOR" as const,
      ...(parsed.data.pendingOnly ? { doctorApproval: "PENDING_APPROVAL" as const } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          email: true,
          name: true,
          status: true,
          doctorApproval: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);
    return { items, total, page: parsed.data.page, pageSize: PAGE_SIZE };
  });
}

export async function suspendDoctor(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:doctors:approve");
    const parsed = z
      .object({ userId: z.string().min(1), reason: z.string().min(REASON_MIN).max(500) })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const reason = validateReason(parsed.data.reason);
    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { role: true, doctorProfileId: true },
    });
    if (!user || user.role !== "DOCTOR") return { ok: false, code: "VALIDATION_ERROR" };

    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { status: "SUSPENDED" },
    });
    await setDoctorBookable(user.doctorProfileId, false);
    await revokeAllUserSessions(parsed.data.userId);
    await revokeRefreshFamiliesForUser(parsed.data.userId);

    // Flag future Confirmed appointments for ops (do not mass-cancel)
    const flagged: string[] = [];
    if (user.doctorProfileId) {
      const future = await prisma.appointment.findMany({
        where: {
          doctorId: user.doctorProfileId,
          status: "CONFIRMED",
          startAt: { gte: new Date() },
        },
        select: { id: true, patientUserId: true },
        take: 200,
      });
      for (const appt of future) {
        await adminAudit({
          type: ADMIN_AUDIT_TYPES.appointmentFlag,
          outcome: "SUCCESS",
          actorUserId: admin.id,
          targetUserId: appt.patientUserId,
          meta: { appointmentId: appt.id, reason: `Doctor suspended: ${reason}`, opsFlag: "DOCTOR_SUSPENDED" },
          ...(await requestMeta()),
        });
        await prisma.notification.create({
          data: {
            recipientUserId: appt.patientUserId,
            category: "APPOINTMENT",
            title: "Appointment needs attention",
            body: "Your upcoming appointment may be affected. Please contact support or reschedule.",
            href: "/patient/appointments",
          },
        });
        flagged.push(appt.id);
      }
    }

    await adminAudit({
      type: ADMIN_AUDIT_TYPES.doctorSuspend,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: parsed.data.userId,
      meta: { reason, flaggedAppointmentIds: flagged },
      ...(await requestMeta()),
    });
    const { notifyAdmins } = await import("@/lib/admin/notify-admins");
    await notifyAdmins({
      category: "ADMIN_OPS",
      title: "Doctor suspended",
      body: `Doctor suspended. ${flagged.length} future appointment(s) flagged for ops.`,
      href: `/admin/doctors/${parsed.data.userId}`,
    });
    revalidatePath("/admin/doctors");
    revalidatePath("/admin/appointments");
    return { ok: true, message: "Doctor suspended." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    const { isAdminDomainError } = await import("@/domain/admin/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isAdminDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}
