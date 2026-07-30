"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient } from "@/actions/patient/_helpers";
import { generateStubAvailability } from "@/lib/patient/availability-stub";

const PAGE_SIZE = 20;

const searchSchema = z.object({
  q: z.string().optional(),
  specialty: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export async function searchDoctors(input: unknown) {
  const parsed = searchSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async () => {
    const { q, specialty, page } = parsed.data;
    const where = {
      status: "PUBLISHED" as const,
      isAvailable: true,
      ...(specialty
        ? { specialty: { slug: specialty } }
        : {}),
      ...(q
        ? {
            OR: [
              { nameEn: { contains: q, mode: "insensitive" as const } },
              { nameAr: { contains: q, mode: "insensitive" as const } },
              { titleEn: { contains: q, mode: "insensitive" as const } },
              { titleAr: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        include: { specialty: { select: { slug: true, nameEn: true, nameAr: true } } },
        orderBy: { nameEn: "asc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.doctor.count({ where }),
    ]);

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

    const availability = generateStubAvailability();
    return { doctor, availability };
  });
}

export async function listSpecialties() {
  return withPatient(async () =>
    prisma.specialty.findMany({ orderBy: { sortOrder: "asc" } }),
  );
}
