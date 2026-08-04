import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";

export type OversightSummary = {
  patientUserId: string;
  counts: {
    allergies: number;
    conditions: number;
    diagnoses: number;
    prescriptionsActive: number;
    labsPending: number;
    documents: number;
    documentsOnHold: number;
    timelineEvents: number;
    consentEvents: number;
  };
  legalHoldDocumentIds: string[];
};

export async function getOversightSummary(
  actor: EmrActor,
  patientUserId: string,
): Promise<PlatformResult<OversightSummary>> {
  const access = await assertEmrAccess(actor, patientUserId, "admin_oversight");
  if (!access.ok) return access;

  const [
    allergies,
    conditions,
    diagnoses,
    prescriptionsActive,
    labsPending,
    documents,
    documentsOnHold,
    timelineEvents,
    consentEvents,
    holdDocs,
  ] = await Promise.all([
    prisma.allergyEntry.count({ where: { patientUserId, ...softDeleteWhere() } }),
    prisma.conditionEntry.count({ where: { patientUserId, ...softDeleteWhere() } }),
    prisma.diagnosis.count({ where: { patientUserId, ...softDeleteWhere() } }),
    prisma.prescription.count({
      where: { patientUserId, status: "ACTIVE", deletedAt: null },
    }),
    prisma.labResult.count({
      where: { patientUserId, releaseStatus: "PENDING_REVIEW" },
    }),
    prisma.clinicalDocument.count({ where: { patientUserId, ...softDeleteWhere() } }),
    prisma.clinicalDocument.count({
      where: { patientUserId, legalHold: true },
    }),
    prisma.emrTimelineEvent.count({ where: { patientUserId } }),
    prisma.consentEvent.count({ where: { patientUserId } }),
    prisma.clinicalDocument.findMany({
      where: { patientUserId, legalHold: true },
      select: { id: true },
    }),
  ]);

  await emrAudit({
    type: "admin.oversight.view",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: patientUserId,
  });

  return platformOk({
    patientUserId,
    counts: {
      allergies,
      conditions,
      diagnoses,
      prescriptionsActive,
      labsPending,
      documents,
      documentsOnHold,
      timelineEvents,
      consentEvents,
    },
    legalHoldDocumentIds: holdDocs.map((d) => d.id),
  });
}

export async function setLegalHold(
  actor: EmrActor,
  input: { documentId: string; hold: boolean },
): Promise<PlatformResult<{ id: string; legalHold: boolean }>> {
  const doc = await prisma.clinicalDocument.findUnique({ where: { id: input.documentId } });
  if (!doc) return platformFail("NOT_FOUND", "Document not found");

  const access = await assertEmrAccess(actor, doc.patientUserId, "admin_oversight");
  if (!access.ok) return access;

  const updated = await prisma.clinicalDocument.update({
    where: { id: doc.id },
    data: { legalHold: input.hold },
  });

  await emrAudit({
    type: "admin.legal_hold",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: doc.patientUserId,
    meta: { documentId: doc.id, hold: input.hold },
  });

  return platformOk({ id: updated.id, legalHold: updated.legalHold });
}
