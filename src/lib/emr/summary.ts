import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";

export type EmrCriticalFlag = {
  id: string;
  kind: "allergy" | "emergency" | "lab";
  label: string;
};

/**
 * Assemble the summary widget's critical-flag list (FR-001) from raw rows.
 * Pure and side-effect free so it can be unit tested without a database.
 * Patients only see labs that have been RELEASED to them (FR-013).
 */
export function buildCriticalFlags(input: {
  patientUserId: string;
  role: EmrActor["role"];
  allergies: Array<{ id: string; substance: string; criticalFlag: boolean }>;
  emergency?: { clinicianCriticalFlag: boolean; criticalAlertsText: string | null } | null;
  criticalLabs: Array<{ id: string; title: string; releaseStatus: string }>;
}): EmrCriticalFlag[] {
  const { patientUserId, role, allergies, emergency, criticalLabs } = input;
  return [
    ...allergies
      .filter((a) => a.criticalFlag)
      .map((a) => ({
        id: `allergy:${a.id}`,
        kind: "allergy" as const,
        label: a.substance,
      })),
    ...(emergency?.clinicianCriticalFlag || emergency?.criticalAlertsText
      ? [
          {
            id: `emergency:${patientUserId}`,
            kind: "emergency" as const,
            label: emergency.criticalAlertsText?.trim() || "Clinician critical flag",
          },
        ]
      : []),
    ...criticalLabs
      .filter((lab) => role !== "PATIENT" || lab.releaseStatus === "RELEASED")
      .map((lab) => ({
        id: `lab:${lab.id}`,
        kind: "lab" as const,
        label: lab.title,
      })),
  ];
}

export type EmrSummaryDto = {
  patientUserId: string;
  demographics: {
    name: string | null;
    email: string;
    dateOfBirth: Date | null;
    sexAtBirth: string | null;
  };
  allergies: Array<{
    id: string;
    substance: string;
    reaction: string | null;
    severity: string | null;
    criticalFlag: boolean;
    source: string;
  }>;
  conditions: Array<{
    id: string;
    display: string;
    icd10Code: string | null;
    status: string;
    source: string;
  }>;
  activeMeds: Array<{
    id: string;
    medicationName: string;
    instructions: string;
    prescribedAt: Date;
    status: string;
  }>;
  recentEncounters: Array<{
    id: string;
    startAt: Date;
    status: string;
    mode: string;
    doctorId: string;
  }>;
  emergency: {
    contactName: string | null;
    contactPhone: string | null;
    criticalAlertsText: string | null;
    clinicianCriticalFlag: boolean;
  } | null;
  criticalFlags: EmrCriticalFlag[];
};

/** Chart summary widget payload (FR-001); audits chart open. */
export async function getSummary(
  actor: EmrActor,
  patientUserId: string,
): Promise<PlatformResult<EmrSummaryDto>> {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const [
    user,
    allergies,
    conditions,
    activeMeds,
    recentEncounters,
    emergency,
    criticalLabs,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: patientUserId },
      select: {
        id: true,
        name: true,
        email: true,
        patientProfile: { select: { dateOfBirth: true, sexAtBirth: true } },
      },
    }),
    prisma.allergyEntry.findMany({
      where: { patientUserId, ...softDeleteWhere() },
      orderBy: [{ criticalFlag: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.conditionEntry.findMany({
      where: { patientUserId, status: "ACTIVE", ...softDeleteWhere() },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.prescription.findMany({
      where: {
        patientUserId,
        status: "ACTIVE",
        deletedAt: null,
      },
      orderBy: { prescribedAt: "desc" },
      take: 20,
    }),
    prisma.appointment.findMany({
      where: {
        patientUserId,
        status: { notIn: ["HELD"] },
      },
      orderBy: { startAt: "desc" },
      take: 5,
      select: { id: true, startAt: true, status: true, mode: true, doctorId: true },
    }),
    prisma.emergencyInfo.findUnique({ where: { patientUserId } }),
    prisma.labResult.findMany({
      where: {
        patientUserId,
        criticalFlag: true,
        releaseStatus: { in: ["PENDING_REVIEW", "RELEASED"] },
      },
      orderBy: { resultedAt: "desc" },
      take: 10,
      select: { id: true, title: true, releaseStatus: true },
    }),
  ]);

  if (!user) {
    return platformOk({
      patientUserId,
      demographics: { name: null, email: "", dateOfBirth: null, sexAtBirth: null },
      allergies: [],
      conditions: [],
      activeMeds: [],
      recentEncounters: [],
      emergency: null,
      criticalFlags: [],
    });
  }

  const criticalFlags = buildCriticalFlags({
    patientUserId,
    role: actor.role,
    allergies,
    emergency,
    criticalLabs,
  });

  await emrAudit({
    type: "chart.open",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: patientUserId,
    meta: { role: actor.role },
  });

  return platformOk({
    patientUserId,
    demographics: {
      name: user.name,
      email: user.email,
      dateOfBirth: user.patientProfile?.dateOfBirth ?? null,
      sexAtBirth: user.patientProfile?.sexAtBirth ?? null,
    },
    allergies: allergies.map((a) => ({
      id: a.id,
      substance: a.substance,
      reaction: a.reaction,
      severity: a.severity,
      criticalFlag: a.criticalFlag,
      source: a.source,
    })),
    conditions: conditions.map((c) => ({
      id: c.id,
      display: c.display,
      icd10Code: c.icd10Code,
      status: c.status,
      source: c.source,
    })),
    activeMeds: activeMeds.map((m) => ({
      id: m.id,
      medicationName: m.medicationName,
      instructions: m.instructions,
      prescribedAt: m.prescribedAt,
      status: m.status,
    })),
    recentEncounters,
    emergency: emergency
      ? {
          contactName: emergency.contactName,
          contactPhone: emergency.contactPhone,
          criticalAlertsText: emergency.criticalAlertsText,
          clinicianCriticalFlag: emergency.clinicianCriticalFlag,
        }
      : null,
    criticalFlags,
  });
}
