import type {
  EmrAttestationSource,
  EmrConditionStatus,
  EmrSeverity,
} from "@prisma/client";
import { assertEmrAccess, type EmrAccessAction, type EmrActor } from "@/domain/emr/access";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";

/** Clinician-attested entries require `write_clinical`; patient-reported entries require `write_self` (FR-036). */
export function writeActionForSource(source: EmrAttestationSource): EmrAccessAction {
  return source === "CLINICIAN_ATTESTED" ? "write_clinical" : "write_self";
}

async function assertHistoryWrite(
  actor: EmrActor,
  patientUserId: string,
  source: EmrAttestationSource,
): Promise<PlatformResult<{ allowed: true }>> {
  return assertEmrAccess(actor, patientUserId, writeActionForSource(source));
}

// ── Allergies ──────────────────────────────────────────────────────────────

export async function listAllergies(actor: EmrActor, patientUserId: string) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;
  const items = await prisma.allergyEntry.findMany({
    where: { patientUserId, ...softDeleteWhere() },
    orderBy: [{ criticalFlag: "desc" }, { updatedAt: "desc" }],
  });
  return platformOk({ items });
}

export async function upsertAllergy(
  actor: EmrActor,
  input: {
    patientUserId: string;
    id?: string;
    substance: string;
    reaction?: string | null;
    severity?: EmrSeverity | null;
    source: EmrAttestationSource;
    criticalFlag?: boolean;
  },
) {
  const substance = input.substance.trim();
  if (!substance) return platformFail("VALIDATION_ERROR", "Substance is required");

  const access = await assertHistoryWrite(actor, input.patientUserId, input.source);
  if (!access.ok) return access;

  const data = {
    substance,
    reaction: input.reaction?.trim() || null,
    severity: input.severity ?? null,
    source: input.source,
    criticalFlag: input.criticalFlag ?? false,
    recordedByUserId: actor.userId,
  };

  let row;
  if (input.id) {
    const existing = await prisma.allergyEntry.findFirst({
      where: { id: input.id, patientUserId: input.patientUserId, ...softDeleteWhere() },
    });
    if (!existing) return platformFail("NOT_FOUND", "Allergy not found");
    row = await prisma.allergyEntry.update({ where: { id: existing.id }, data });
  } else {
    row = await prisma.allergyEntry.create({
      data: { patientUserId: input.patientUserId, ...data },
    });
  }

  await emrAudit({
    type: "history.allergy.upsert",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { id: row.id, source: input.source },
  });

  return platformOk(row);
}

export async function softDeleteAllergy(
  actor: EmrActor,
  input: { patientUserId: string; id: string; source: EmrAttestationSource },
) {
  const access = await assertHistoryWrite(actor, input.patientUserId, input.source);
  if (!access.ok) return access;

  const existing = await prisma.allergyEntry.findFirst({
    where: { id: input.id, patientUserId: input.patientUserId, ...softDeleteWhere() },
  });
  if (!existing) return platformFail("NOT_FOUND", "Allergy not found");

  const row = await prisma.allergyEntry.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedByUserId: actor.userId },
  });

  await emrAudit({
    type: "history.allergy.delete",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { id: row.id },
  });

  return platformOk(row);
}

// ── Conditions ─────────────────────────────────────────────────────────────

export async function listConditions(actor: EmrActor, patientUserId: string) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;
  const items = await prisma.conditionEntry.findMany({
    where: { patientUserId, ...softDeleteWhere() },
    orderBy: { updatedAt: "desc" },
  });
  return platformOk({ items });
}

export async function upsertCondition(
  actor: EmrActor,
  input: {
    patientUserId: string;
    id?: string;
    display: string;
    icd10Code?: string | null;
    status?: EmrConditionStatus;
    source: EmrAttestationSource;
    onsetDate?: Date | null;
  },
) {
  const display = input.display.trim();
  if (!display) return platformFail("VALIDATION_ERROR", "Display is required");

  const access = await assertHistoryWrite(actor, input.patientUserId, input.source);
  if (!access.ok) return access;

  const data = {
    display,
    icd10Code: input.icd10Code?.trim() || null,
    status: input.status ?? "ACTIVE",
    source: input.source,
    onsetDate: input.onsetDate ?? null,
    recordedByUserId: actor.userId,
  };

  let row;
  if (input.id) {
    const existing = await prisma.conditionEntry.findFirst({
      where: { id: input.id, patientUserId: input.patientUserId, ...softDeleteWhere() },
    });
    if (!existing) return platformFail("NOT_FOUND", "Condition not found");
    row = await prisma.conditionEntry.update({ where: { id: existing.id }, data });
  } else {
    row = await prisma.conditionEntry.create({
      data: { patientUserId: input.patientUserId, ...data },
    });
  }

  await emrAudit({
    type: "history.condition.upsert",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { id: row.id, source: input.source },
  });

  return platformOk(row);
}

export async function softDeleteCondition(
  actor: EmrActor,
  input: { patientUserId: string; id: string; source: EmrAttestationSource },
) {
  const access = await assertHistoryWrite(actor, input.patientUserId, input.source);
  if (!access.ok) return access;

  const existing = await prisma.conditionEntry.findFirst({
    where: { id: input.id, patientUserId: input.patientUserId, ...softDeleteWhere() },
  });
  if (!existing) return platformFail("NOT_FOUND", "Condition not found");

  const row = await prisma.conditionEntry.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedByUserId: actor.userId },
  });

  await emrAudit({
    type: "history.condition.delete",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { id: row.id },
  });

  return platformOk(row);
}

// ── Immunizations ──────────────────────────────────────────────────────────

export async function listImmunizations(actor: EmrActor, patientUserId: string) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;
  const items = await prisma.immunizationEntry.findMany({
    where: { patientUserId, ...softDeleteWhere() },
    orderBy: { administeredOn: "desc" },
  });
  return platformOk({ items });
}

export async function upsertImmunization(
  actor: EmrActor,
  input: {
    patientUserId: string;
    id?: string;
    vaccineName: string;
    administeredOn?: Date | null;
    source: EmrAttestationSource;
    lotNumber?: string | null;
  },
) {
  const vaccineName = input.vaccineName.trim();
  if (!vaccineName) return platformFail("VALIDATION_ERROR", "Vaccine name is required");

  const access = await assertHistoryWrite(actor, input.patientUserId, input.source);
  if (!access.ok) return access;

  const data = {
    vaccineName,
    administeredOn: input.administeredOn ?? null,
    source: input.source,
    lotNumber: input.lotNumber?.trim() || null,
    recordedByUserId: actor.userId,
  };

  let row;
  if (input.id) {
    const existing = await prisma.immunizationEntry.findFirst({
      where: { id: input.id, patientUserId: input.patientUserId, ...softDeleteWhere() },
    });
    if (!existing) return platformFail("NOT_FOUND", "Immunization not found");
    row = await prisma.immunizationEntry.update({ where: { id: existing.id }, data });
  } else {
    row = await prisma.immunizationEntry.create({
      data: { patientUserId: input.patientUserId, ...data },
    });
  }

  await emrAudit({
    type: "history.immunization.upsert",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { id: row.id },
  });

  return platformOk(row);
}

export async function softDeleteImmunization(
  actor: EmrActor,
  input: { patientUserId: string; id: string; source: EmrAttestationSource },
) {
  const access = await assertHistoryWrite(actor, input.patientUserId, input.source);
  if (!access.ok) return access;

  const existing = await prisma.immunizationEntry.findFirst({
    where: { id: input.id, patientUserId: input.patientUserId, ...softDeleteWhere() },
  });
  if (!existing) return platformFail("NOT_FOUND", "Immunization not found");

  const row = await prisma.immunizationEntry.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedByUserId: actor.userId },
  });

  await emrAudit({
    type: "history.immunization.delete",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { id: row.id },
  });

  return platformOk(row);
}

// ── Family history ─────────────────────────────────────────────────────────

export async function listFamilyHistory(actor: EmrActor, patientUserId: string) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;
  const items = await prisma.familyHistoryEntry.findMany({
    where: { patientUserId, ...softDeleteWhere() },
    orderBy: { updatedAt: "desc" },
  });
  return platformOk({ items });
}

export async function upsertFamilyHistory(
  actor: EmrActor,
  input: {
    patientUserId: string;
    id?: string;
    relation: string;
    conditionDisplay: string;
    notes?: string | null;
    source?: EmrAttestationSource;
  },
) {
  const relation = input.relation.trim();
  const conditionDisplay = input.conditionDisplay.trim();
  if (!relation || !conditionDisplay) {
    return platformFail("VALIDATION_ERROR", "Relation and condition are required");
  }

  const source = input.source ?? "PATIENT_REPORTED";
  const access = await assertHistoryWrite(actor, input.patientUserId, source);
  if (!access.ok) return access;

  const data = {
    relation,
    conditionDisplay,
    notes: input.notes?.trim() || null,
    source,
    recordedByUserId: actor.userId,
  };

  let row;
  if (input.id) {
    const existing = await prisma.familyHistoryEntry.findFirst({
      where: { id: input.id, patientUserId: input.patientUserId, ...softDeleteWhere() },
    });
    if (!existing) return platformFail("NOT_FOUND", "Family history entry not found");
    row = await prisma.familyHistoryEntry.update({ where: { id: existing.id }, data });
  } else {
    row = await prisma.familyHistoryEntry.create({
      data: { patientUserId: input.patientUserId, ...data },
    });
  }

  await emrAudit({
    type: "history.family.upsert",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { id: row.id },
  });

  return platformOk(row);
}

export async function softDeleteFamilyHistory(
  actor: EmrActor,
  input: { patientUserId: string; id: string; source?: EmrAttestationSource },
) {
  const source = input.source ?? "PATIENT_REPORTED";
  const access = await assertHistoryWrite(actor, input.patientUserId, source);
  if (!access.ok) return access;

  const existing = await prisma.familyHistoryEntry.findFirst({
    where: { id: input.id, patientUserId: input.patientUserId, ...softDeleteWhere() },
  });
  if (!existing) return platformFail("NOT_FOUND", "Family history entry not found");

  const row = await prisma.familyHistoryEntry.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), deletedByUserId: actor.userId },
  });

  await emrAudit({
    type: "history.family.delete",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { id: row.id },
  });

  return platformOk(row);
}

// ── Lifestyle ──────────────────────────────────────────────────────────────

export async function getLifestyle(actor: EmrActor, patientUserId: string) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;
  const profile = await prisma.lifestyleProfile.findUnique({ where: { patientUserId } });
  return platformOk(profile);
}

export async function updateLifestyle(
  actor: EmrActor,
  input: {
    patientUserId: string;
    smoking?: string | null;
    alcohol?: string | null;
    activity?: string | null;
    notes?: string | null;
  },
) {
  const access = await assertEmrAccess(actor, input.patientUserId, "write_self");
  if (!access.ok) return access;

  const profile = await prisma.lifestyleProfile.upsert({
    where: { patientUserId: input.patientUserId },
    create: {
      patientUserId: input.patientUserId,
      smoking: input.smoking ?? null,
      alcohol: input.alcohol ?? null,
      activity: input.activity ?? null,
      notes: input.notes ?? null,
    },
    update: {
      ...(input.smoking !== undefined ? { smoking: input.smoking } : {}),
      ...(input.alcohol !== undefined ? { alcohol: input.alcohol } : {}),
      ...(input.activity !== undefined ? { activity: input.activity } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });

  await emrAudit({
    type: "history.lifestyle.update",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
  });

  return platformOk(profile);
}

// ── Emergency ──────────────────────────────────────────────────────────────

export async function getEmergencyInfo(actor: EmrActor, patientUserId: string) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;
  const info = await prisma.emergencyInfo.findUnique({ where: { patientUserId } });
  return platformOk(info);
}

export async function updateEmergencyInfo(
  actor: EmrActor,
  input: {
    patientUserId: string;
    contactName?: string | null;
    contactPhone?: string | null;
    criticalAlertsText?: string | null;
    clinicianCriticalFlag?: boolean;
  },
) {
  const touchesClinicianFlag = input.clinicianCriticalFlag !== undefined;
  const access = await assertEmrAccess(
    actor,
    input.patientUserId,
    touchesClinicianFlag ? "write_clinical" : "write_self",
  );
  if (!access.ok) return access;

  const info = await prisma.emergencyInfo.upsert({
    where: { patientUserId: input.patientUserId },
    create: {
      patientUserId: input.patientUserId,
      contactName: input.contactName ?? null,
      contactPhone: input.contactPhone ?? null,
      criticalAlertsText: input.criticalAlertsText ?? null,
      clinicianCriticalFlag: input.clinicianCriticalFlag ?? false,
    },
    update: {
      ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.criticalAlertsText !== undefined
        ? { criticalAlertsText: input.criticalAlertsText }
        : {}),
      ...(input.clinicianCriticalFlag !== undefined
        ? { clinicianCriticalFlag: input.clinicianCriticalFlag }
        : {}),
    },
  });

  await emrAudit({
    type: "history.emergency.update",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { clinicianCriticalFlag: info.clinicianCriticalFlag },
  });

  return platformOk(info);
}
