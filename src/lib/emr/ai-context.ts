import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import { canPatientSeeLab } from "@/domain/emr/release";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";

export type AiChartContext = {
  patientUserId: string;
  allergies: Array<{ substance: string; severity: string | null; criticalFlag: boolean }>;
  conditions: Array<{ display: string; icd10Code: string | null; status: string }>;
  activeMedications: Array<{ medicationName: string; instructions: string }>;
  recentDiagnoses: Array<{ display: string; icd10Code: string | null; recordedAt: Date }>;
  emergency: {
    criticalAlertsText: string | null;
    clinicianCriticalFlag: boolean;
  } | null;
  releasedLabs: Array<{ title: string; summary: string | null; resultedAt: Date; criticalFlag: boolean }>;
  bloodType?: string | null;
  profileNotes?: string | null;
  immunizations?: string[];
  upcomingVisits?: string[];
  recentVisitNotes?: string[];
};

/**
 * Authorized structured chart snapshot for Platform AI (read-only; never signs/writes).
 */
export async function buildAiChartContext(
  actor: EmrActor,
  patientUserId: string,
): Promise<PlatformResult<AiChartContext>> {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const [allergies, conditions, meds, diagnoses, emergency, labs, profile, immunizations, upcoming, visitNotes] =
    await Promise.all([
    prisma.allergyEntry.findMany({
      where: { patientUserId, ...softDeleteWhere() },
      select: { substance: true, severity: true, criticalFlag: true },
      take: 50,
    }),
    prisma.conditionEntry.findMany({
      where: { patientUserId, status: "ACTIVE", ...softDeleteWhere() },
      select: { display: true, icd10Code: true, status: true },
      take: 50,
    }),
    prisma.prescription.findMany({
      where: { patientUserId, status: "ACTIVE", deletedAt: null },
      select: { medicationName: true, instructions: true },
      take: 30,
    }),
    prisma.diagnosis.findMany({
      where: { patientUserId, ...softDeleteWhere() },
      orderBy: { recordedAt: "desc" },
      select: { display: true, icd10Code: true, recordedAt: true },
      take: 20,
    }),
    prisma.emergencyInfo.findUnique({
      where: { patientUserId },
      select: { criticalAlertsText: true, clinicianCriticalFlag: true },
    }),
    prisma.labResult.findMany({
      where: { patientUserId },
      orderBy: { resultedAt: "desc" },
      take: 20,
      select: {
        title: true,
        summary: true,
        resultedAt: true,
        criticalFlag: true,
        releaseStatus: true,
      },
    }),
    prisma.medicalProfile.findUnique({
      where: { userId: patientUserId },
      select: {
        bloodType: true,
        notes: true,
        allergies: true,
        conditions: true,
        currentMedications: true,
      },
    }),
    prisma.immunizationEntry.findMany({
      where: { patientUserId, ...softDeleteWhere() },
      select: { vaccineName: true, administeredOn: true },
      take: 20,
    }),
    prisma.appointment.findMany({
      where: {
        patientUserId,
        startAt: { gte: new Date() },
        status: { in: ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "HELD"] },
      },
      orderBy: { startAt: "asc" },
      take: 5,
      select: { startAt: true, mode: true, reason: true, doctor: { select: { nameEn: true } } },
    }),
    prisma.clinicalSummary.findMany({
      where: { patientUserId, status: "FINAL" },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: { body: true, updatedAt: true },
    }),
  ]);

  const releasedLabs = labs
    .filter((lab) => {
      if (actor.role === "PATIENT") return canPatientSeeLab(lab.releaseStatus);
      return lab.releaseStatus === "RELEASED" || lab.releaseStatus === "PENDING_REVIEW";
    })
    .map(({ title, summary, resultedAt, criticalFlag }) => ({
      title,
      summary,
      resultedAt,
      criticalFlag,
    }));

  await emrAudit({
    type: "ai.context.build",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: patientUserId,
    meta: { role: actor.role },
  });

  return platformOk({
    patientUserId,
    allergies: [
      ...allergies.map((a) => ({
        substance: a.substance,
        severity: a.severity,
        criticalFlag: a.criticalFlag,
      })),
      ...(profile?.allergies ?? []).map((substance) => ({
        substance,
        severity: null,
        criticalFlag: false,
      })),
    ],
    conditions: [
      ...conditions.map((c) => ({
        display: c.display,
        icd10Code: c.icd10Code,
        status: c.status,
      })),
      ...(profile?.conditions ?? []).map((display) => ({
        display,
        icd10Code: null,
        status: "ACTIVE",
      })),
    ],
    activeMedications: [
      ...meds,
      ...(profile?.currentMedications ?? []).map((medicationName) => ({
        medicationName,
        instructions: "",
      })),
    ],
    recentDiagnoses: diagnoses,
    emergency,
    releasedLabs,
    bloodType: profile?.bloodType ?? null,
    profileNotes: profile?.notes ?? null,
    immunizations: immunizations.map((row) =>
      row.administeredOn
        ? `${row.vaccineName} (${row.administeredOn.toISOString().slice(0, 10)})`
        : row.vaccineName,
    ),
    upcomingVisits: upcoming.map((visit) => {
      const when = visit.startAt.toISOString().slice(0, 16).replace("T", " ");
      return `${when} ${visit.mode} with ${visit.doctor.nameEn}${visit.reason ? ` (${visit.reason})` : ""}`;
    }),
    recentVisitNotes: visitNotes
      .map((note) => note.body.trim())
      .filter(Boolean)
      .map((body) => body.slice(0, 400)),
  });
}
