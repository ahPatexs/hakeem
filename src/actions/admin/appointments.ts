"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requestMeta,
  withAdminPermission,
  type AdminActionResult,
  type AdminMutationResult,
} from "@/actions/admin/_helpers";
import { PAGE_SIZE, REASON_MIN } from "@/domain/admin/constants";
import { adminAudit, ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";
import { validateReason } from "@/domain/admin/user-lifecycle";

const CANCELLABLE = ["CONFIRMED", "CHECKED_IN", "HELD"] as const;

export async function listAppointments(input: unknown): Promise<
  AdminActionResult<{
    items: Array<{
      id: string;
      status: string;
      mode: string;
      startAt: Date;
      patientEmail: string;
      doctorName: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>
> {
  return withAdminPermission("admin:appointments:read", async () => {
    const parsed = z
      .object({
        status: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        doctorId: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
      })
      .safeParse(input ?? {});
    if (!parsed.success) throw new Error("VALIDATION_ERROR");
    const { status, from, to, doctorId } = parsed.data;
    const where = {
      ...(status ? { status: status as never } : {}),
      ...(doctorId ? { doctorId } : {}),
      ...(from || to
        ? {
            startAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { startAt: "desc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          patient: { select: { email: true } },
          doctor: { select: { nameEn: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        status: r.status,
        mode: r.mode,
        startAt: r.startAt,
        patientEmail: r.patient.email,
        doctorName: r.doctor.nameEn,
      })),
      total,
      page: parsed.data.page,
      pageSize: PAGE_SIZE,
    };
  });
}

export async function getAppointment(id: string): Promise<
  AdminActionResult<{
    id: string;
    status: string;
    mode: string;
    startAt: Date;
    endAt: Date;
    reason: string | null;
    cancellationReason: string | null;
    patientEmail: string;
    doctorName: string;
  } | null>
> {
  return withAdminPermission("admin:appointments:read", async () => {
    const row = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { email: true } },
        doctor: { select: { nameEn: true } },
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      status: row.status,
      mode: row.mode,
      startAt: row.startAt,
      endAt: row.endAt,
      reason: row.reason,
      cancellationReason: row.cancellationReason,
      patientEmail: row.patient.email,
      doctorName: row.doctor.nameEn,
    };
  });
}

export async function cancelAppointmentAdmin(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:appointments:write");
    const parsed = z
      .object({ appointmentId: z.string().min(1), reason: z.string().min(REASON_MIN).max(500) })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const reason = validateReason(parsed.data.reason);
    const appt = await prisma.appointment.findUnique({
      where: { id: parsed.data.appointmentId },
      include: { doctor: { select: { id: true } }, patient: { select: { id: true } } },
    });
    if (!appt) return { ok: false, code: "NOT_FOUND" };
    if (!CANCELLABLE.includes(appt.status as (typeof CANCELLABLE)[number])) {
      return { ok: false, code: "INVALID_STATUS" };
    }
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "CANCELLED", cancellationReason: reason },
    });
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.appointmentCancel,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: appt.patientUserId,
      meta: { appointmentId: appt.id, reason },
      ...(await requestMeta()),
    });

    const doctorUser = await prisma.user.findFirst({
      where: { doctorProfileId: appt.doctorId },
      select: { id: true },
    });
    const notifyRows = [
      {
        recipientUserId: appt.patientUserId,
        category: "APPOINTMENT" as const,
        title: "Appointment cancelled",
        body: "An administrator cancelled your appointment. Please rebook if needed.",
        href: "/patient/appointments",
      },
    ];
    if (doctorUser) {
      notifyRows.push({
        recipientUserId: doctorUser.id,
        category: "APPOINTMENT",
        title: "Appointment cancelled by admin",
        body: "An administrator cancelled one of your appointments.",
        href: "/doctor/appointments",
      });
    }
    await prisma.notification.createMany({ data: notifyRows });

    revalidatePath("/admin/appointments");
    return { ok: true, message: "Appointment cancelled." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    const { isAdminDomainError } = await import("@/domain/admin/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isAdminDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function flagAppointmentAdmin(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:appointments:write");
    const parsed = z
      .object({ appointmentId: z.string().min(1), reason: z.string().min(REASON_MIN).max(500) })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    const reason = validateReason(parsed.data.reason);
    const appt = await prisma.appointment.findUnique({ where: { id: parsed.data.appointmentId } });
    if (!appt) return { ok: false, code: "NOT_FOUND" };
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.appointmentFlag,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: appt.patientUserId,
      meta: { appointmentId: appt.id, reason },
      ...(await requestMeta()),
    });
    return { ok: true, message: "Appointment flagged." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}
