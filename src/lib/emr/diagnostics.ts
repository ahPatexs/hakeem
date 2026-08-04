import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import { canDoctorSeeLab, canPatientSeeLab, type LabReleaseStatus } from "@/domain/emr/release";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";
import { inChartSearch, textContains, type InChartSearchFilters } from "./search";
import { upsertTimelineEvent } from "./timeline";

function visibleStatusesForRole(role: EmrActor["role"]): LabReleaseStatus[] {
  if (role === "PATIENT") return ["RELEASED"];
  if (role === "DOCTOR") return ["PENDING_REVIEW", "RELEASED"];
  return ["PENDING_REVIEW", "RELEASED", "RETRACTED", "SUPERSEDED"];
}

/** Imaging results share the `LabResult` table (T131); no schema migration needed. */
const IMAGING_PANEL_PREFIX = "IMG_";

export async function listLabResults(
  actor: EmrActor,
  patientUserId: string,
  filters: InChartSearchFilters = {},
) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const search = inChartSearch(filters);
  const contains = textContains(search.q);
  const statuses = visibleStatusesForRole(actor.role);

  const where = {
    patientUserId,
    releaseStatus: { in: statuses },
    ...(contains ? { title: contains } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.labResult.count({ where }),
    prisma.labResult.findMany({
      where,
      orderBy: [{ criticalFlag: "desc" }, { resultedAt: "desc" }],
      skip: search.skip,
      take: search.take,
    }),
  ]);

  const items = rows.filter((lab) => {
    if (actor.role === "PATIENT") return canPatientSeeLab(lab.releaseStatus);
    if (actor.role === "DOCTOR") return canDoctorSeeLab(lab.releaseStatus);
    return true;
  });

  return platformOk({
    items,
    total,
    page: search.page,
    pageCount: Math.max(1, Math.ceil(total / search.take)),
  });
}

/**
 * Imaging (radiology) results, scoped to a single unified `LabResult` table
 * (T131). Identified by a `IMG_` panel code prefix or a linked
 * `IMAGING_REPORT` clinical document — no schema migration required.
 */
export async function listImagingResults(
  actor: EmrActor,
  patientUserId: string,
  filters: InChartSearchFilters = {},
) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const search = inChartSearch(filters);
  const contains = textContains(search.q);
  const statuses = visibleStatusesForRole(actor.role);

  const where = {
    patientUserId,
    releaseStatus: { in: statuses },
    OR: [
      { panelCode: { startsWith: IMAGING_PANEL_PREFIX } },
      { document: { kind: "IMAGING_REPORT" as const } },
    ],
    ...(contains ? { title: contains } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.labResult.count({ where }),
    prisma.labResult.findMany({
      where,
      orderBy: [{ criticalFlag: "desc" }, { resultedAt: "desc" }],
      skip: search.skip,
      take: search.take,
    }),
  ]);

  const items = rows.filter((lab) => {
    if (actor.role === "PATIENT") return canPatientSeeLab(lab.releaseStatus);
    if (actor.role === "DOCTOR") return canDoctorSeeLab(lab.releaseStatus);
    return true;
  });

  return platformOk({
    items,
    total,
    page: search.page,
    pageCount: Math.max(1, Math.ceil(total / search.take)),
  });
}

/** Doctor lab-review inbox across their panel, release-rule aware (T127). */
export async function listLabInboxForDoctor(
  actor: EmrActor,
  patientUserIds: string[],
) {
  if (actor.role !== "DOCTOR" || !actor.doctorId) {
    return platformFail("FORBIDDEN", "Doctor profile required");
  }
  if (patientUserIds.length === 0) {
    return platformOk({ pending: [], reviewed: [] });
  }

  const statuses = visibleStatusesForRole(actor.role);
  const labs = await prisma.labResult.findMany({
    where: {
      patientUserId: { in: patientUserIds },
      releaseStatus: { in: statuses },
    },
    orderBy: [{ criticalFlag: "desc" }, { resultedAt: "desc" }],
    take: 100,
    include: {
      patient: { select: { id: true, name: true } },
      reviewAcks: { where: { doctorUserId: actor.userId }, select: { reviewedAt: true } },
    },
  });

  const pending = labs.filter((l) => l.reviewAcks.length === 0);
  const reviewed = labs.filter((l) => l.reviewAcks.length > 0).slice(0, 20);

  await emrAudit({
    type: "diagnostics.lab.inbox.view",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    meta: { count: labs.length },
  });

  return platformOk({ pending, reviewed });
}

export async function getLabResult(actor: EmrActor, labResultId: string) {
  const lab = await prisma.labResult.findUnique({
    where: { id: labResultId },
    include: { document: true },
  });
  if (!lab) return platformFail("NOT_FOUND", "Lab result not found");

  const access = await assertEmrAccess(actor, lab.patientUserId, "read");
  if (!access.ok) return access;

  if (actor.role === "PATIENT" && !canPatientSeeLab(lab.releaseStatus)) {
    return platformFail("NOT_FOUND", "Lab result not found");
  }
  if (actor.role === "DOCTOR" && !canDoctorSeeLab(lab.releaseStatus)) {
    return platformFail("NOT_FOUND", "Lab result not found");
  }

  await emrAudit({
    type: "diagnostics.lab.view",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: lab.patientUserId,
    meta: { labResultId: lab.id },
  });

  return platformOk(lab);
}

export async function releaseLabToPatient(
  actor: EmrActor,
  input: { labResultId: string },
): Promise<PlatformResult<{ id: string }>> {
  const lab = await prisma.labResult.findUnique({ where: { id: input.labResultId } });
  if (!lab) return platformFail("NOT_FOUND", "Lab result not found");

  const access = await assertEmrAccess(actor, lab.patientUserId, "write_clinical");
  if (!access.ok) return access;

  if (lab.releaseStatus === "RELEASED") {
    return platformOk({ id: lab.id });
  }
  if (lab.releaseStatus !== "PENDING_REVIEW") {
    return platformFail("CONFLICT", "Lab cannot be released from current status");
  }

  const updated = await prisma.labResult.update({
    where: { id: lab.id },
    data: { releaseStatus: "RELEASED" },
  });

  await prisma.notification.create({
    data: {
      recipientUserId: lab.patientUserId,
      category: "RESULTS",
      title: "Lab result available",
      body: "A lab result has been reviewed and released.",
      href: "/patient/labs",
    },
  });

  await upsertTimelineEvent({
    patientUserId: lab.patientUserId,
    type: "LAB",
    effectiveAt: updated.resultedAt,
    refType: "LabResult",
    refId: updated.id,
    title: updated.title,
    summary: updated.summary,
    actorUserId: actor.userId,
    visibility: "ALL_AUTHORIZED",
    status: "ACTIVE",
  });

  await emrAudit({
    type: "diagnostics.lab.release",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: lab.patientUserId,
    meta: { labResultId: lab.id },
  });

  return platformOk({ id: updated.id });
}

/**
 * Doctor lab-inbox review: acknowledge review and release PENDING_REVIEW labs
 * to the patient via the same release path (T135 / FR-021).
 */
export async function acknowledgeAndReleaseLab(
  actor: EmrActor,
  input: { labResultId: string },
): Promise<PlatformResult<{ id: string; released: boolean }>> {
  const lab = await prisma.labResult.findUnique({
    where: { id: input.labResultId },
    select: { id: true, patientUserId: true, releaseStatus: true },
  });
  if (!lab) return platformFail("NOT_FOUND", "Lab result not found");

  const access = await assertEmrAccess(actor, lab.patientUserId, "write_clinical");
  if (!access.ok) return access;

  await prisma.labReviewAcknowledgement.upsert({
    where: {
      labResultId_doctorUserId: { labResultId: lab.id, doctorUserId: actor.userId },
    },
    update: {},
    create: { labResultId: lab.id, doctorUserId: actor.userId },
  });

  let released = false;
  if (lab.releaseStatus === "PENDING_REVIEW") {
    const release = await releaseLabToPatient(actor, { labResultId: lab.id });
    if (!release.ok) return release;
    released = true;
  }

  await emrAudit({
    type: "diagnostics.lab.reviewed",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: lab.patientUserId,
    meta: { labResultId: lab.id, released },
  });

  return platformOk({ id: lab.id, released });
}

export async function retractLab(
  actor: EmrActor,
  input: { labResultId: string },
): Promise<PlatformResult<{ id: string }>> {
  const lab = await prisma.labResult.findUnique({ where: { id: input.labResultId } });
  if (!lab) return platformFail("NOT_FOUND", "Lab result not found");

  const access = await assertEmrAccess(actor, lab.patientUserId, "write_clinical");
  if (!access.ok) return access;

  if (lab.releaseStatus === "RETRACTED") {
    return platformOk({ id: lab.id });
  }

  const updated = await prisma.labResult.update({
    where: { id: lab.id },
    data: { releaseStatus: "RETRACTED" },
  });

  await upsertTimelineEvent({
    patientUserId: lab.patientUserId,
    type: "LAB",
    effectiveAt: new Date(),
    refType: "LabResult",
    refId: updated.id,
    title: `${updated.title} (retracted)`,
    summary: updated.summary,
    actorUserId: actor.userId,
    visibility: "CLINICIAN",
    status: "SUPERSEDED",
  });

  await emrAudit({
    type: "diagnostics.lab.retract",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: lab.patientUserId,
    meta: { labResultId: lab.id },
  });

  return platformOk({ id: updated.id });
}
