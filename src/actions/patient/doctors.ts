"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient } from "@/actions/patient/_helpers";
import { searchDoctors as platformSearchDoctors } from "@/lib/platform/search";
import { getDoctorAvailabilityByDoctorId } from "@/lib/patient/availability";

const PAGE_SIZE = 20;

const searchSchema = z.object({
  q: z.string().optional(),
  specialty: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  locale: z.enum(["en", "ar"]).optional(),
});

export async function searchDoctors(input: unknown) {
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async () => {
    const { q, specialty, page, locale = "ar" } = parsed.data;

    // bookableOnly: unpublished / unapproved doctors are never offered.
    const result = await platformSearchDoctors({
      q,
      specialty,
      locale,
      bookableOnly: true,
    });
    if (!result.ok) return { items: [], total: 0, page, pageSize: PAGE_SIZE };

    const hits = result.data.items;
    const total = hits.length;
    const pageHits = hits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const ids = pageHits.map((h) => h.doctorId);

    if (ids.length === 0) {
      return { items: [], total, page, pageSize: PAGE_SIZE };
    }

    const doctors = await prisma.doctor.findMany({
      where: { id: { in: ids } },
      include: { specialty: { select: { slug: true, nameEn: true, nameAr: true } } },
    });
    const byId = new Map(doctors.map((d) => [d.id, d]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((d): d is (typeof doctors)[number] => Boolean(d));

    return { items, total, page, pageSize: PAGE_SIZE };
  });
}

export async function getDoctorBySlug(slug: string) {
  return withPatient(async (userId) => {
    const doctor = await prisma.doctor.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: { specialty: true, weeklyHours: { orderBy: { weekday: "asc" } } },
    });
    if (!doctor) return null;

    const projection = await prisma.searchDoctorProjection.findUnique({
      where: { doctorId: doctor.id },
      select: { isBookable: true },
    });
    if (projection && !projection.isBookable) return null;
    if (!projection) {
      const { refreshDoctorProjection } = await import("@/lib/platform/search");
      await refreshDoctorProjection(doctor.id);
      const refreshed = await prisma.searchDoctorProjection.findUnique({
        where: { doctorId: doctor.id },
        select: { isBookable: true },
      });
      if (!refreshed?.isBookable) return null;
    }

    const [availability, reviewRows, scoreGroups, pendingRate] = await Promise.all([
      getDoctorAvailabilityByDoctorId(doctor.id),
      prisma.doctorRating.findMany({
        where: { doctorId: doctor.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          score: true,
          comment: true,
          createdAt: true,
          patient: { select: { name: true } },
        },
      }),
      prisma.doctorRating.groupBy({
        by: ["score"],
        where: { doctorId: doctor.id },
        _count: { _all: true },
      }),
      prisma.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          patientUserId: userId,
          status: "COMPLETED",
          rating: { is: null },
        },
        orderBy: { startAt: "desc" },
        select: { id: true },
      }),
    ]);

    const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of scoreGroups) {
      if (row.score >= 1 && row.score <= 5) {
        ratingBreakdown[row.score as 1 | 2 | 3 | 4 | 5] = row._count._all;
      }
    }

    const { weeklyHours, ...doctorFields } = doctor;

    return {
      doctor: doctorFields,
      availability,
      hours: weeklyHours.map((row) => ({
        weekday: row.weekday,
        startMinutes: row.startMinutes,
        endMinutes: row.endMinutes,
      })),
      reviews: reviewRows.map((row) => ({
        id: row.id,
        score: row.score,
        comment: row.comment,
        createdAt: row.createdAt.toISOString(),
        reviewerName: row.patient.name?.trim().split(/\s+/)[0] ?? "",
      })),
      ratingBreakdown,
      pendingRateAppointmentId: pendingRate?.id ?? null,
    };
  });
}

export async function getDoctorAvailability(input: unknown) {
  const parsed = z.object({ slug: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async () => {
    const doctor = await prisma.doctor.findFirst({
      where: { slug: parsed.data.slug, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!doctor) {
      return { slots: [], timezone: "Asia/Riyadh", unavailableReason: "NOT_BOOKABLE" as const };
    }
    return getDoctorAvailabilityByDoctorId(doctor.id);
  });
}

export async function listSpecialties() {
  return withPatient(async () =>
    prisma.specialty.findMany({ orderBy: { sortOrder: "asc" } }),
  );
}
