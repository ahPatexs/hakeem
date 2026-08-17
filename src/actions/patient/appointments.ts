"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient, withPatientMutation } from "@/actions/patient/_helpers";
import {
  canCancel,
  canConfirmHold,
  canReschedule,
  computeHoldExpiresAt,
  canRateAppointmentStatus,
  isValidRatingScore,
} from "@/domain/patient/appointments";
import { createNotification } from "@/lib/patient/notifications";
import { auditPhiAccess } from "@/lib/patient/phi-audit";
import { AuthDomainError } from "@/auth/errors";
import { CareLoopError } from "@/domain/care-loop/errors";
import { assertSlotIsOfferable } from "@/lib/patient/availability";
import { notifyDoctorAppointmentConfirmed } from "@/lib/doctor/notification-triggers";
import { patientHistoryWhere, patientUpcomingWhere } from "@/lib/patient/appointment-queries";
import { formatApptWhen } from "@/lib/datetime";

const PAGE_SIZE = 20;

async function patientLocaleFor(userId: string): Promise<"en" | "ar"> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      localePreference: true,
      portalSettings: { select: { locale: true } },
    },
  });
  const pref = user?.portalSettings?.locale ?? user?.localePreference;
  return pref === "EN" ? "en" : "ar";
}

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
      rating: { select: { id: true, score: true, comment: true } },
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

    await assertSlotIsOfferable({ doctorId, startAt: start, endAt: end });

    const appointment = await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          doctorId,
          status: { in: ["HELD", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
          startAt: { lt: end },
          endAt: { gt: start },
          OR: [{ status: "HELD", holdExpiresAt: { gt: new Date() } }, { status: { not: "HELD" } }],
        },
      });
      if (conflict) throw new CareLoopError("SLOT_UNAVAILABLE");

      return tx.appointment.create({
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

    const locale = await patientLocaleFor(userId);

    await createNotification({
      recipientUserId: userId,
      category: "APPOINTMENT",
      title: "Appointment confirmed",
      body: `Your appointment on ${formatApptWhen(updated.startAt, locale)} is confirmed.`,
      href: `/patient/appointments/${updated.id}`,
    });

    const doctorUser = await prisma.user.findFirst({
      where: { doctorProfileId: updated.doctorId },
      select: { id: true },
    });
    if (doctorUser) {
      const patient = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      });
      await notifyDoctorAppointmentConfirmed(
        doctorUser.id,
        updated.id,
        patient?.name ?? patient?.email ?? "Patient",
      );
    }

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

    const locale = await patientLocaleFor(userId);

    await createNotification({
      recipientUserId: userId,
      category: "APPOINTMENT",
      title: "Appointment cancelled",
      body: `Your appointment on ${formatApptWhen(updated.startAt, locale)} was cancelled.`,
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
    await assertSlotIsOfferable({
      doctorId: appt.doctorId,
      startAt: start,
      endAt: end,
      ignoreAppointmentIds: [appt.id],
    });

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

    const locale = await patientLocaleFor(userId);

    await createNotification({
      recipientUserId: userId,
      category: "APPOINTMENT",
      title: "Appointment rescheduled",
      body: `Your appointment was moved to ${formatApptWhen(start, locale)}.`,
      href: `/patient/appointments/${created.id}`,
    });

    return { cancelled: updated, appointment: created };
  });
}

export async function listUpcoming(input?: unknown) {
  const parsed = listSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const where = patientUpcomingWhere(userId);

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
      items,
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
    const where = patientHistoryWhere(userId);

    const [items, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          doctor: {
            select: { id: true, slug: true, nameEn: true, nameAr: true, photoUrl: true },
          },
          rating: { select: { id: true, score: true } },
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

const rateSchema = z.object({
  appointmentId: z.string().min(1),
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export async function rateDoctorVisit(input: unknown) {
  const parsed = rateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const { revalidatePath } = await import("next/cache");
    if (!isValidRatingScore(parsed.data.score)) {
      throw new AuthDomainError("VALIDATION_ERROR", "Rating must be 1 to 5 stars");
    }

    const appt = await prisma.appointment.findFirst({
      where: { id: parsed.data.appointmentId, patientUserId: userId },
      select: { id: true, doctorId: true, status: true },
    });
    if (!appt) throw new AuthDomainError("FORBIDDEN", "Appointment not found");
    if (!canRateAppointmentStatus(appt.status)) {
      throw new AuthDomainError("VALIDATION_ERROR", "Rate only after a completed visit");
    }

    const comment = parsed.data.comment?.trim() ? parsed.data.comment.trim().slice(0, 500) : null;

    const result = await prisma.$transaction(async (tx) => {
      await tx.doctorRating.upsert({
        where: { appointmentId: appt.id },
        create: {
          doctorId: appt.doctorId,
          patientUserId: userId,
          appointmentId: appt.id,
          score: parsed.data.score,
          comment,
        },
        update: { score: parsed.data.score, comment },
      });
      const agg = await tx.doctorRating.aggregate({
        where: { doctorId: appt.doctorId },
        _avg: { score: true },
        _count: { _all: true },
      });
      const count = agg._count._all;
      const avg = count === 0 ? 0 : Math.round((agg._avg.score ?? 0) * 10) / 10;
      await tx.doctor.update({
        where: { id: appt.doctorId },
        data: { ratingAvg: avg, ratingCount: count },
      });
      await tx.searchDoctorProjection.updateMany({
        where: { doctorId: appt.doctorId },
        data: { ratingAvg: avg, ratingCount: count },
      });
      return { score: parsed.data.score, ratingAvg: avg, ratingCount: count };
    });

    revalidatePath("/[locale]/patient", "layout");
    revalidatePath("/[locale]/doctors", "page");
    return result;
  });
}
