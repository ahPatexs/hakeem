"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { AppointmentStatus } from "@prisma/client";
import { withPatient, withPatientMutation } from "@/actions/patient/_helpers";
import {
  canCancel,
  canConfirmHold,
  canReschedule,
  computeHoldExpiresAt,
  isHoldExpired,
} from "@/domain/patient/appointments";
import { createNotification } from "@/lib/patient/notifications";
import { auditPhiAccess } from "@/lib/patient/phi-audit";
import { AuthDomainError } from "@/auth/errors";

const PAGE_SIZE = 20;

const holdSchema = z.object({
  doctorId: z.string().min(1),
  mode: z.enum(["IN_PERSON", "VIDEO"]),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().max(500).optional(),
});

const idSchema = z.object({ id: z.string().min(1) });

const cancelSchema = z.object({
  id: z.string().min(1),
  reason: z.string().max(500).optional(),
});

const rescheduleSchema = z.object({
  id: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

async function assertOwnAppointment(userId: string, id: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id, patientUserId: userId },
    include: {
      doctor: {
        select: { id: true, slug: true, nameEn: true, nameAr: true, photoUrl: true },
      },
    },
  });
  if (!appt) throw new AuthDomainError("FORBIDDEN", "Appointment not found");
  return appt;
}

export async function holdAppointmentSlot(input: unknown) {
  const parsed = holdSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const { doctorId, mode, startAt, endAt, reason } = parsed.data;
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (start.getTime() <= Date.now()) {
      throw new AuthDomainError("VALIDATION_ERROR", "Slot must be in the future");
    }

    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, status: "PUBLISHED", isAvailable: true },
    });
    if (!doctor) throw new AuthDomainError("FORBIDDEN", "Doctor not available");

    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { in: ["HELD", "CONFIRMED", "IN_PROGRESS"] },
        startAt: { lt: end },
        endAt: { gt: start },
        OR: [{ status: "HELD", holdExpiresAt: { gt: new Date() } }, { status: { not: "HELD" } }],
      },
    });
    if (conflict) throw new AuthDomainError("VALIDATION_ERROR", "Slot unavailable");

    const appointment = await prisma.appointment.create({
      data: {
        patientUserId: userId,
        doctorId,
        mode,
        status: "HELD",
        startAt: start,
        endAt: end,
        holdExpiresAt: computeHoldExpiresAt(),
        reason: reason ?? null,
      },
      include: {
        doctor: {
          select: { id: true, slug: true, nameEn: true, nameAr: true, photoUrl: true },
        },
      },
    });

    return appointment;
  });
}

export async function confirmAppointment(input: unknown) {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const appt = await assertOwnAppointment(userId, parsed.data.id);
    if (!canConfirmHold(appt)) {
      throw new AuthDomainError("VALIDATION_ERROR", "Hold expired or invalid");
    }

    const updated = await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: "CONFIRMED", holdExpiresAt: null },
      include: {
        doctor: {
          select: { id: true, slug: true, nameEn: true, nameAr: true, photoUrl: true },
        },
      },
    });

    await createNotification({
      patientUserId: userId,
      category: "APPOINTMENT",
      title: "Appointment confirmed",
      body: `Your appointment on ${updated.startAt.toLocaleString()} is confirmed.`,
      href: `/patient/appointments/${updated.id}`,
    });

    return updated;
  });
}

export async function cancelAppointment(input: unknown) {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const appt = await assertOwnAppointment(userId, parsed.data.id);
    if (!canCancel(appt)) {
      throw new AuthDomainError("VALIDATION_ERROR", "Cannot cancel this appointment");
    }

    const updated = await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: "CANCELLED",
        cancellationReason: parsed.data.reason ?? null,
        holdExpiresAt: null,
      },
    });

    await createNotification({
      patientUserId: userId,
      category: "APPOINTMENT",
      title: "Appointment cancelled",
      body: `Your appointment on ${updated.startAt.toLocaleString()} was cancelled.`,
      href: `/patient/appointments/history`,
    });

    return updated;
  });
}

export async function rescheduleAppointment(input: unknown) {
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const appt = await assertOwnAppointment(userId, parsed.data.id);
    if (!canReschedule(appt)) {
      throw new AuthDomainError("VALIDATION_ERROR", "Cannot reschedule this appointment");
    }

    const start = new Date(parsed.data.startAt);
    const end = new Date(parsed.data.endAt);

    const [updated, created] = await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appt.id },
        data: { status: "CANCELLED", cancellationReason: "Rescheduled" },
      }),
      prisma.appointment.create({
        data: {
          patientUserId: userId,
          doctorId: appt.doctorId,
          mode: appt.mode,
          status: "CONFIRMED",
          startAt: start,
          endAt: end,
          rescheduledFromId: appt.id,
          reason: appt.reason,
        },
        include: {
          doctor: {
            select: { id: true, slug: true, nameEn: true, nameAr: true, photoUrl: true },
          },
        },
      }),
    ]);

    await createNotification({
      patientUserId: userId,
      category: "APPOINTMENT",
      title: "Appointment rescheduled",
      body: `Your appointment was moved to ${start.toLocaleString()}.`,
      href: `/patient/appointments/${created.id}`,
    });

    return { cancelled: updated, appointment: created };
  });
}

export async function listUpcoming(input?: unknown) {
  const parsed = listSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const now = new Date();
    const where = {
      patientUserId: userId,
      status: { in: ["HELD", "CONFIRMED", "IN_PROGRESS"] as AppointmentStatus[] },
      OR: [{ status: "HELD" as const }, { startAt: { gte: now } }],
    };

    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          doctor: {
            select: { id: true, slug: true, nameEn: true, nameAr: true, photoUrl: true },
          },
        },
        orderBy: { startAt: "asc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      items: items.filter(
        (a) => a.status !== "HELD" || !isHoldExpired(a.holdExpiresAt),
      ),
      total,
      page: parsed.data.page,
      pageSize: PAGE_SIZE,
    };
  });
}

export async function listHistory(input?: unknown) {
  const parsed = listSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const where = {
      patientUserId: userId,
      status: { in: ["CANCELLED", "COMPLETED", "NO_SHOW"] as AppointmentStatus[] },
    };

    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          doctor: {
            select: { id: true, slug: true, nameEn: true, nameAr: true, photoUrl: true },
          },
        },
        orderBy: { startAt: "desc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.appointment.count({ where }),
    ]);

    return { items, total, page: parsed.data.page, pageSize: PAGE_SIZE };
  });
}

export async function getAppointment(id: string) {
  return withPatient(async (userId) => {
    const appt = await assertOwnAppointment(userId, id);
    await auditPhiAccess("phi.view.record", userId, { appointmentId: id });
    return appt;
  });
}
