import { prisma } from "@/lib/prisma";
import { CARE_WINDOW_MONTHS, assertCareRelationship } from "@/domain/doctor/care-relationship";

export const PATIENT_PAGE_SIZE = 12;

export interface PanelPatient {
  id: string;
  name: string | null;
  email: string;
  lastVisitAt: Date | null;
  nextVisitAt: Date | null;
}

/**
 * Search is restricted to the doctor's own panel (FR-008):
 * patients with an appointment in the rolling window or an explicit
 * panel assignment. Never searches the global patient population.
 */
export async function searchPanelPatients(
  doctorId: string,
  query: string,
  page: number,
): Promise<{ items: PanelPatient[]; total: number; pageCount: number }> {
  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - CARE_WINDOW_MONTHS);

  const [apptRows, panelRows] = await Promise.all([
    prisma.appointment.findMany({
      where: { doctorId, status: { notIn: ["HELD"] }, startAt: { gte: windowStart } },
      select: { patientUserId: true },
      distinct: ["patientUserId"],
    }),
    prisma.doctorPatientPanel.findMany({
      where: { doctorId },
      select: { patientUserId: true },
    }),
  ]);

  const ids = [...new Set([...apptRows, ...panelRows].map((r) => r.patientUserId))];
  if (ids.length === 0) return { items: [], total: 0, pageCount: 0 };

  const where = {
    id: { in: ids },
    role: "PATIENT" as const,
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PATIENT_PAGE_SIZE,
      take: PATIENT_PAGE_SIZE,
      select: { id: true, name: true, email: true },
    }),
  ]);

  const now = new Date();
  const visits = await Promise.all(
    users.map(async (u) => {
      const [last, next] = await Promise.all([
        prisma.appointment.findFirst({
          where: { doctorId, patientUserId: u.id, startAt: { lt: now }, status: { in: ["COMPLETED", "IN_PROGRESS"] } },
          orderBy: { startAt: "desc" },
          select: { startAt: true },
        }),
        prisma.appointment.findFirst({
          where: { doctorId, patientUserId: u.id, startAt: { gte: now }, status: { in: ["CONFIRMED", "CHECKED_IN"] } },
          orderBy: { startAt: "asc" },
          select: { startAt: true },
        }),
      ]);
      return { ...u, lastVisitAt: last?.startAt ?? null, nextVisitAt: next?.startAt ?? null };
    }),
  );

  return { items: visits, total, pageCount: Math.ceil(total / PATIENT_PAGE_SIZE) };
}

/** Full patient chart bundle — care relationship enforced before load. */
export async function getPatientChart(doctorId: string, patientUserId: string) {
  await assertCareRelationship(doctorId, patientUserId);

  const [user, profile, medicalProfile, records, labs, prescriptions, pastVisits, soapNotes] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: patientUserId },
        select: { id: true, name: true, email: true },
      }),
      prisma.patientProfile.findUnique({ where: { userId: patientUserId } }),
      prisma.medicalProfile.findUnique({ where: { userId: patientUserId } }),
      prisma.medicalRecord.findMany({
        where: { patientUserId },
        orderBy: { recordedAt: "desc" },
        take: 50,
        include: { doctor: { select: { nameEn: true, nameAr: true } } },
      }),
      prisma.labResult.findMany({
        where: { patientUserId, releaseStatus: { in: ["PENDING_REVIEW", "RELEASED"] } },
        orderBy: { resultedAt: "desc" },
        take: 50,
      }),
      prisma.prescription.findMany({
        where: { patientUserId, status: { not: "DRAFT" } },
        orderBy: { prescribedAt: "desc" },
        take: 30,
        include: { lines: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.appointment.findMany({
        where: { patientUserId, doctorId, status: { in: ["COMPLETED", "IN_PROGRESS", "CONFIRMED", "CHECKED_IN"] } },
        orderBy: { startAt: "desc" },
        take: 20,
      }),
      prisma.soapNote.findMany({
        where: { patientUserId, doctorId, status: { in: ["DRAFT", "FINAL"] } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

  if (!user) return null;

  return { user, profile, medicalProfile, records, labs, prescriptions, pastVisits, soapNotes };
}
