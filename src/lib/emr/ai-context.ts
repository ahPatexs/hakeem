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

  const [allergies, conditions, meds, diagnoses, emergency, labs] = await Promise.all([
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
    allergies: allergies.map((a) => ({
      substance: a.substance,
      severity: a.severity,
      criticalFlag: a.criticalFlag,
    })),
    conditions: conditions.map((c) => ({
      display: c.display,
      icd10Code: c.icd10Code,
      status: c.status,
    })),
    activeMedications: meds,
    recentDiagnoses: diagnoses,
    emergency,
    releasedLabs,
  });
}
