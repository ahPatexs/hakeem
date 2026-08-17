"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient } from "@/actions/patient/_helpers";
import { auditPhiAccess } from "@/lib/patient/phi-audit";
import { AuthDomainError } from "@/auth/errors";

const PAGE_SIZE = 20;
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1) });

export async function listRecords(input?: unknown) {
  const parsed = listSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const where = { patientUserId: userId };
    const [items, total] = await Promise.all([
      prisma.medicalRecord.findMany({
        where,
        include: {
          doctor: { select: { nameEn: true, nameAr: true } },
          document: { select: { id: true, title: true } },
        },
        orderBy: { recordedAt: "desc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.medicalRecord.count({ where }),
    ]);
    await auditPhiAccess("phi.view.record", userId);
    return { items, total, page: parsed.data.page, pageSize: PAGE_SIZE };
  });
}

export async function getRecord(id: string) {
  return withPatient(async (userId) => {
    const record = await prisma.medicalRecord.findFirst({
      where: { id, patientUserId: userId },
      include: {
        doctor: { select: { nameEn: true, nameAr: true, slug: true } },
        document: true,
      },
    });
    if (!record) throw new AuthDomainError("FORBIDDEN");
    await auditPhiAccess("phi.view.record", userId, { recordId: id });
    return record;
  });
}

/** Patient-facing care activity timeline (platform FR-021). */
export async function getMyActivityTimeline() {
  return withPatient(async (userId) => {
    const { getPatientTimeline } = await import("@/lib/platform/timeline");
    const result = await getPatientTimeline({
      patientUserId: userId,
      viewerUserId: userId,
      viewerRole: "PATIENT",
      limit: 30,
    });
    if (!result.ok) throw new AuthDomainError("FORBIDDEN", result.message);
    return result.data;
  });
}

export async function getMyVisitNotes(appointmentId: string) {
  return withPatient(async (userId) => {
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, patientUserId: userId },
      select: { id: true },
    });
    if (!appt) throw new AuthDomainError("FORBIDDEN");

    const record = await prisma.medicalRecord.findFirst({
      where: {
        appointmentId,
        patientUserId: userId,
        recordType: "VISIT_SUMMARY",
      },
      select: { id: true, title: true, summary: true, recordedAt: true },
    });
    if (!record?.summary) return null;
    await auditPhiAccess("phi.view.record", userId, { recordId: record.id, appointmentId });
    return {
      id: record.id,
      title: record.title,
      body: record.summary,
      recordedAt: record.recordedAt.toISOString(),
    };
  });
}
