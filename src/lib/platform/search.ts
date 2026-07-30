import { prisma } from "@/lib/prisma";
import {
  buildSearchText,
  filterDiscoveryDoctors,
  type DoctorSearchHit,
  type DoctorSearchProjection,
} from "@/domain/platform/search";
import { platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { enqueue } from "@/lib/platform/jobs";

export async function refreshDoctorProjection(doctorId: string): Promise<void> {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: { specialty: { select: { slug: true, nameEn: true, nameAr: true } } },
  });
  if (!doctor) {
    await prisma.searchDoctorProjection.deleteMany({ where: { doctorId } });
    return;
  }

  const linkedUser = await prisma.user.findFirst({
    where: { doctorProfileId: doctorId },
    select: { doctorApproval: true, status: true },
  });

  const isPublished = doctor.status === "PUBLISHED";
  const isBookable =
    isPublished &&
    doctor.isAvailable &&
    linkedUser?.status === "ACTIVE" &&
    linkedUser?.doctorApproval === "APPROVED";

  const specialtyKeys = doctor.specialty ? [doctor.specialty.slug] : [];
  const searchText = buildSearchText([
    doctor.nameEn,
    doctor.nameAr,
    doctor.titleEn ?? "",
    doctor.titleAr ?? "",
    doctor.specialty?.nameEn ?? "",
    doctor.specialty?.nameAr ?? "",
    ...specialtyKeys,
  ]);

  await prisma.searchDoctorProjection.upsert({
    where: { doctorId },
    create: {
      doctorId,
      nameEn: doctor.nameEn,
      nameAr: doctor.nameAr,
      specialtyKeys,
      city: null,
      isBookable,
      isPublished,
      searchText,
      indexedAt: new Date(),
    },
    update: {
      nameEn: doctor.nameEn,
      nameAr: doctor.nameAr,
      specialtyKeys,
      isBookable,
      isPublished,
      searchText,
      indexedAt: new Date(),
    },
  });
}

export async function enqueueDoctorSearchRefresh(doctorId: string): Promise<void> {
  await enqueue({
    type: "SEARCH_REFRESH_DOCTOR",
    idempotencyKey: `search:doctor:${doctorId}`,
    payload: { doctorId },
  });
}

export async function searchDoctors(input: {
  q?: string;
  specialty?: string;
  locale: "en" | "ar";
  bookableOnly?: boolean;
}): Promise<PlatformResult<{ items: DoctorSearchHit[] }>> {
  const rows = await prisma.searchDoctorProjection.findMany({
    orderBy: { indexedAt: "desc" },
    take: 200,
  });

  const projections: DoctorSearchProjection[] = rows.map((r) => ({
    doctorId: r.doctorId,
    nameEn: r.nameEn,
    nameAr: r.nameAr,
    specialtyKeys: r.specialtyKeys,
    city: r.city,
    isBookable: r.isBookable,
    isPublished: r.isPublished,
    searchText: r.searchText,
  }));

  const filtered = filterDiscoveryDoctors(projections, {
    q: input.q,
    specialty: input.specialty,
    bookableOnly: input.bookableOnly,
  });

  const items: DoctorSearchHit[] = filtered.map((d) => ({
    doctorId: d.doctorId,
    name: input.locale === "ar" ? d.nameAr : d.nameEn,
    specialtyKeys: d.specialtyKeys,
    city: d.city,
    isBookable: d.isBookable,
  }));

  return platformOk({ items });
}
