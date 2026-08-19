"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuthDomainError, isAuthDomainError } from "@/auth/errors";
import { CareLoopError, isCareLoopError } from "@/domain/care-loop/errors";
import { requireRole } from "@/auth/guards";
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
import { assertSlotIsOfferable } from "@/lib/patient/availability";
import { notifyDoctorAppointmentConfirmed } from "@/lib/doctor/notification-triggers";
import { patientHistoryWhere, patientUpcomingWhere } from "@/lib/patient/appointment-queries";
import { formatApptWhen } from "@/lib/datetime";
import { parseInstant } from "@/lib/appointment-instant";

const PAGE_SIZE = 20;

const doctorPreviewSelect = {
  id: true,
  slug: true,
  nameEn: true,
  nameAr: true,
  photoUrl: true,
} as const;

type BookingDoctor = {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  photoUrl: string | null;
};

function toBookingDto(row: {
  id: string;
  status: string;
  startAt: Date | string;
  endAt: Date | string;
  doctor: BookingDoctor;
}) {
  return {
    id: row.id,
    status: row.status,
    startAt: new Date(row.startAt).toISOString(),
    endAt: new Date(row.endAt).toISOString(),
    doctor: {
      id: row.doctor.id,
      slug: row.doctor.slug,
      nameEn: row.doctor.nameEn,
      nameAr: row.doctor.nameAr,
      photoUrl: row.doctor.photoUrl,
    },
  };
}

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
  slug: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
    z.string().min(1).optional(),
  ),
  mode: z.enum(["IN_PERSON", "VIDEO"]),
  startAt: z.unknown(),
  endAt: z.unknown(),
  reason: z.string().max(500).optional(),
});

const idSchema = z.object({ id: z.string().min(1) });

const cancelSchema = z.object({
  id: z.string().min(1),
  reason: z.string().max(500).optional(),
});

const rescheduleSchema = z.object({
  id: z.string().min(1),
  startAt: z.unknown(),
  endAt: z.unknown(),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

async function assertOwnAppointment(userId: string, id: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id, patientUserId: userId },
    include: {
      doctor: { select: doctorPreviewSelect },
      rating: { select: { id: true, score: true, comment: true } },
      paymentObligations: {
        select: { id: true, amountCents: true, currency: true, status: true },
        take: 1,
      },
    },
  });
  if (!appt) throw new AuthDomainError("FORBIDDEN", "Appointment not found");
  return appt;
}

export async function holdAppointmentSlot(input: unknown) {
  const parsed = holdSchema.safeParse(input);
  const start = parseInstant(parsed.success ? parsed.data.startAt : undefined);
  const end = parseInstant(parsed.success ? parsed.data.endAt : undefined);
  if (!parsed.success || !start || !end) {
    console.error("[holdAppointmentSlot] validation", {
      success: parsed.success,
      issues: parsed.success ? undefined : parsed.error.flatten(),
      startAtType: typeof (input as { startAt?: unknown } | null)?.startAt,
      endAtType: typeof (input as { endAt?: unknown } | null)?.endAt,
    });
    return { ok: false as const, code: "VALIDATION_ERROR" };
  }

  return withPatient(async (userId) => {
    const { doctorId, mode, reason } = parsed.data;
    const slug = parsed.data.slug?.trim() || undefined;
    if (start.getTime() <= Date.now()) {
      throw new CareLoopError("SLOT_HORIZON");
    }
    const doctor =
      (slug
        ? await prisma.doctor.findFirst({
            where: { slug, status: "PUBLISHED", isAvailable: true },
          })
        : null) ??
      (await prisma.doctor.findFirst({
        where: { id: doctorId, status: "PUBLISHED", isAvailable: true },
      }));
    if (!doctor) throw new AuthDomainError("FORBIDDEN", "Doctor not available");

    const ownHold = await prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        patientUserId: userId,
        status: "HELD",
        startAt: { lt: end },
        endAt: { gt: start },
      },
      select: { id: true },
    });
    await assertSlotIsOfferable({
      doctorId: doctor.id,
      startAt: start,
      endAt: end,
      ignoreAppointmentIds: ownHold ? [ownHold.id] : undefined,
    });

    const appointment = await prisma.$transaction(async (tx) => {
      const conflict = await tx.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          status: { in: ["HELD", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
          startAt: { lt: end },
          endAt: { gt: start },
          OR: [{ status: "HELD", holdExpiresAt: { gt: new Date() } }, { status: { not: "HELD" } }],
        },
        include: { doctor: { select: doctorPreviewSelect } },
      });
      if (conflict) {
        if (conflict.patientUserId === userId && conflict.status === "HELD") {
          return tx.appointment.update({
            where: { id: conflict.id },
            data: {
              mode,
              reason: reason ?? conflict.reason,
              holdExpiresAt: computeHoldExpiresAt(),
            },
            include: { doctor: { select: doctorPreviewSelect } },
          });
        }
        throw new CareLoopError("SLOT_UNAVAILABLE");
      }

      return tx.appointment.create({
        data: {
          patientUserId: userId,
          doctorId: doctor.id,
          mode,
          status: "HELD",
          startAt: start,
          endAt: end,
          holdExpiresAt: computeHoldExpiresAt(),
          reason: reason ?? null,
        },
        include: { doctor: { select: doctorPreviewSelect } },
      });
    });

    return toBookingDto(appointment);
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
      include: { doctor: { select: doctorPreviewSelect } },
    });

    try {
      const { ensurePayableObligation } = await import("@/lib/platform/payments");
      const { getConsultationFeeCents } = await import("@/lib/admin/maintenance");
      await ensurePayableObligation({
        appointmentId: updated.id,
        patientUserId: userId,
        amountCents: await getConsultationFeeCents(),
        description: `Consultation — ${updated.doctor.nameEn}`,
      });
    } catch (error) {
      console.error("[confirmAppointment] obligation", error);
    }

    const locale = await patientLocaleFor(userId);

    try {
      await createNotification({
        recipientUserId: userId,
        category: "APPOINTMENT",
        title: "Appointment confirmed",
        body: `Your appointment on ${formatApptWhen(updated.startAt, locale)} is confirmed.`,
        href: `/patient/appointments/${updated.id}`,
      });
    } catch (error) {
      console.error("[confirmAppointment] notify patient", error);
    }

    try {
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
    } catch (error) {
      console.error("[confirmAppointment] notify doctor", error);
    }

    return toBookingDto(updated);
  });
}

export async function bookDoctorSlot(input: unknown) {
  const parsed = holdSchema.safeParse(input);
  const start = parseInstant(parsed.success ? parsed.data.startAt : undefined);
  const end = parseInstant(parsed.success ? parsed.data.endAt : undefined);
  if (!parsed.success || !start || !end) {
    console.error("[bookDoctorSlot] validation", {
      success: parsed.success,
      issues: parsed.success ? undefined : parsed.error.flatten(),
      startAtType: typeof (input as { startAt?: unknown } | null)?.startAt,
      endAtType: typeof (input as { endAt?: unknown } | null)?.endAt,
    });
    return { ok: false as const, code: "VALIDATION_ERROR" };
  }

  try {
    const { id: userId } = await requireRole("PATIENT");
    if (start.getTime() <= Date.now()) {
      throw new CareLoopError("SLOT_HORIZON");
    }

    const { doctorId, mode, reason } = parsed.data;
    const slug = parsed.data.slug?.trim() || undefined;
    const doctor =
      (slug
        ? await prisma.doctor.findFirst({
            where: { slug, status: "PUBLISHED", isAvailable: true },
          })
        : null) ??
      (await prisma.doctor.findFirst({
        where: { id: doctorId, status: "PUBLISHED", isAvailable: true },
      }));
    if (!doctor) throw new AuthDomainError("FORBIDDEN", "Doctor not available");

    const own = await prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        patientUserId: userId,
        status: { in: ["HELD", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
        startAt: { lt: end },
        endAt: { gt: start },
      },
      include: { doctor: { select: doctorPreviewSelect } },
    });
    if (own && own.status !== "HELD") {
      return { ok: true as const, data: toBookingDto(own) };
    }

    await assertSlotIsOfferable({
      doctorId: doctor.id,
      startAt: start,
      endAt: end,
      ignoreAppointmentIds: own ? [own.id] : undefined,
    });

    const row = own
      ? await prisma.appointment.update({
          where: { id: own.id },
          data: { status: "CONFIRMED", holdExpiresAt: null, mode },
          include: { doctor: { select: doctorPreviewSelect } },
        })
      : await prisma.appointment.create({
          data: {
            patientUserId: userId,
            doctorId: doctor.id,
            mode,
            status: "CONFIRMED",
            startAt: start,
            endAt: end,
            reason: reason ?? null,
          },
          include: { doctor: { select: doctorPreviewSelect } },
        });

    const booked = toBookingDto(row);

    try {
      const { ensurePayableObligation } = await import("@/lib/platform/payments");
      const { getConsultationFeeCents } = await import("@/lib/admin/maintenance");
      await ensurePayableObligation({
        appointmentId: row.id,
        patientUserId: userId,
        amountCents: await getConsultationFeeCents(),
        description: `Consultation — ${row.doctor.nameEn}`,
      });
    } catch (error) {
      console.error("[bookDoctorSlot] obligation", error);
    }

    try {
      const locale = await patientLocaleFor(userId);
      await createNotification({
        recipientUserId: userId,
        category: "APPOINTMENT",
        title: "Appointment confirmed",
        body: `Your appointment on ${formatApptWhen(row.startAt, locale)} is confirmed.`,
        href: `/patient/appointments/${row.id}`,
      });
    } catch (error) {
      console.error("[bookDoctorSlot] notify patient", error);
    }

    try {
      const doctorUser = await prisma.user.findFirst({
        where: { doctorProfileId: row.doctorId, role: "DOCTOR" },
        select: { id: true },
      });
      if (doctorUser) {
        const patient = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });
        await notifyDoctorAppointmentConfirmed(
          doctorUser.id,
          row.id,
          patient?.name ?? patient?.email ?? "Patient",
        );
      }
    } catch (error) {
      console.error("[bookDoctorSlot] notify doctor", error);
    }

    return { ok: true as const, data: booked };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false as const, code: error.code };
    if (isCareLoopError(error)) return { ok: false as const, code: error.code };
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error("[bookDoctorSlot]", error);
    return { ok: false as const, code: "UNKNOWN", detail };
  }
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

    const { cancelUnpaidObligationForAppointment } = await import("@/lib/platform/payments");
    await cancelUnpaidObligationForAppointment(updated.id);

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

    const start = parseInstant(parsed.data.startAt);
    const end = parseInstant(parsed.data.endAt);
    if (!start || !end) {
      throw new AuthDomainError("VALIDATION_ERROR", "Invalid slot time");
    }
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

    const { cancelUnpaidObligationForAppointment, ensurePayableObligation } = await import(
      "@/lib/platform/payments"
    );
    const { getConsultationFeeCents } = await import("@/lib/admin/maintenance");
    await cancelUnpaidObligationForAppointment(updated.id);
    await ensurePayableObligation({
      appointmentId: created.id,
      patientUserId: userId,
      amountCents: await getConsultationFeeCents(),
      description: `Consultation — ${created.doctor.nameEn}`,
    });

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
