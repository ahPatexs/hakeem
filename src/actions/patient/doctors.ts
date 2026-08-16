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
  return withPatient(async () => {
    const doctor = await prisma.doctor.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: { specialty: true },
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

    const availability = await getDoctorAvailabilityByDoctorId(doctor.id);
    return { doctor, availability };
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
