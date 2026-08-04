import type {
  EmrTimelineEventStatus,
  EmrTimelineEventType,
  EmrTimelineVisibility,
  Prisma,
} from "@prisma/client";
import { assertEmrAccess, type EmrActor } from "@/domain/emr/access";
import { sortTimelineEvents, visibilityForRole } from "@/domain/emr/timeline";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";

export type UpsertTimelineEventInput = {
  patientUserId: string;
  type: EmrTimelineEventType;
  effectiveAt: Date;
  refType: string;
  refId: string;
  title: string;
  summary?: string | null;
  actorUserId?: string | null;
  visibility?: EmrTimelineVisibility;
  status?: EmrTimelineEventStatus;
};

export type TimelineListFilters = {
  types?: EmrTimelineEventType[];
  from?: Date;
  to?: Date;
  cursor?: string;
  limit?: number;
  includeHidden?: boolean;
};

export type TimelineListItem = {
  id: string;
  type: EmrTimelineEventType;
  effectiveAt: Date;
  title: string;
  summary: string | null;
  refType: string;
  refId: string;
  status: EmrTimelineEventStatus;
  visibility: EmrTimelineVisibility;
  actorUserId: string | null;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/** Idempotent materialization keyed by (refType, refId, type). */
export async function upsertTimelineEvent(
  input: UpsertTimelineEventInput,
): Promise<PlatformResult<TimelineListItem>> {
  const row = await prisma.emrTimelineEvent.upsert({
    where: {
      refType_refId_type: {
        refType: input.refType,
        refId: input.refId,
        type: input.type,
      },
    },
    create: {
      patientUserId: input.patientUserId,
      type: input.type,
      effectiveAt: input.effectiveAt,
      refType: input.refType,
      refId: input.refId,
      title: input.title,
      summary: input.summary ?? null,
      actorUserId: input.actorUserId ?? null,
      visibility: input.visibility ?? "ALL_AUTHORIZED",
      status: input.status ?? "ACTIVE",
    },
    update: {
      effectiveAt: input.effectiveAt,
      title: input.title,
      summary: input.summary ?? null,
      actorUserId: input.actorUserId ?? null,
      visibility: input.visibility ?? undefined,
      status: input.status ?? undefined,
    },
  });

  return platformOk({
    id: row.id,
    type: row.type,
    effectiveAt: row.effectiveAt,
    title: row.title,
    summary: row.summary,
    refType: row.refType,
    refId: row.refId,
    status: row.status,
    visibility: row.visibility,
    actorUserId: row.actorUserId,
  });
}

export async function listTimeline(
  patientUserId: string,
  actor: EmrActor,
  filters: TimelineListFilters = {},
): Promise<PlatformResult<{ items: TimelineListItem[]; nextCursor?: string }>> {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const limit = Math.min(Math.max(filters.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const where: Prisma.EmrTimelineEventWhereInput = {
    patientUserId,
    ...(filters.types?.length ? { type: { in: filters.types } } : {}),
    ...(filters.from || filters.to
      ? {
          effectiveAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
    ...(filters.includeHidden && actor.role === "ADMIN"
      ? {}
      : { status: { not: "HIDDEN" as const } }),
  };

  if (filters.cursor) {
    const cursorRow = await prisma.emrTimelineEvent.findUnique({
      where: { id: filters.cursor },
      select: { effectiveAt: true, id: true },
    });
    if (cursorRow) {
      where.OR = [
        { effectiveAt: { lt: cursorRow.effectiveAt } },
        { effectiveAt: cursorRow.effectiveAt, id: { lt: cursorRow.id } },
      ];
    }
  }

  const rows = await prisma.emrTimelineEvent.findMany({
    where,
    orderBy: [{ effectiveAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const visible = sortTimelineEvents(
    rows.filter((r) => visibilityForRole(actor.role, r.visibility)),
  );

  const page = visible.slice(0, limit);
  const nextCursor = visible.length > limit ? page[page.length - 1]?.id : undefined;

  await emrAudit({
    type: "timeline.list",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: patientUserId,
    meta: { count: page.length, types: filters.types ?? null },
  });

  return platformOk({
    items: page.map((r) => ({
      id: r.id,
      type: r.type,
      effectiveAt: r.effectiveAt,
      title: r.title,
      summary: r.summary,
      refType: r.refType,
      refId: r.refId,
      status: r.status,
      visibility: r.visibility,
      actorUserId: r.actorUserId,
    })),
    nextCursor,
  });
}

/**
 * Materialize EmrTimelineEvent rows from historical appointments, signed SOAP,
 * prescriptions, labs, and clinical documents (T089). Idempotent via upsert keys.
 */
export async function backfillTimelineForPatient(
  patientUserId: string,
): Promise<PlatformResult<{ upserted: number }>> {
  let upserted = 0;

  const appointments = await prisma.appointment.findMany({
    where: { patientUserId },
    select: {
      id: true,
      startAt: true,
      status: true,
      reason: true,
      mode: true,
    },
  });
  for (const a of appointments) {
    await upsertTimelineEvent({
      patientUserId,
      type: "APPOINTMENT",
      effectiveAt: a.startAt,
      refType: "Appointment",
      refId: a.id,
      title: `Appointment (${a.status})`,
      summary: a.reason ?? a.mode,
      visibility: "ALL_AUTHORIZED",
    });
    upserted += 1;
  }

  const notes = await prisma.soapNote.findMany({
    where: { patientUserId, status: "FINAL" },
    select: { id: true, signedAt: true, updatedAt: true, status: true },
  });
  for (const n of notes) {
    await upsertTimelineEvent({
      patientUserId,
      type: "NOTE",
      effectiveAt: n.signedAt ?? n.updatedAt,
      refType: "SoapNote",
      refId: n.id,
      title: `SOAP note (${n.status})`,
      visibility: "CLINICIAN",
    });
    upserted += 1;
  }

  const rxs = await prisma.prescription.findMany({
    where: { patientUserId, status: { not: "DRAFT" }, deletedAt: null },
    select: { id: true, prescribedAt: true, medicationName: true, status: true },
  });
  for (const rx of rxs) {
    await upsertTimelineEvent({
      patientUserId,
      type: "PRESCRIPTION",
      effectiveAt: rx.prescribedAt,
      refType: "Prescription",
      refId: rx.id,
      title: `Prescription (${rx.status})`,
      summary: rx.medicationName,
      visibility: "ALL_AUTHORIZED",
    });
    upserted += 1;
  }

  const labs = await prisma.labResult.findMany({
    where: { patientUserId },
    select: {
      id: true,
      resultedAt: true,
      title: true,
      releaseStatus: true,
    },
  });
  for (const lab of labs) {
    await upsertTimelineEvent({
      patientUserId,
      type: "LAB",
      effectiveAt: lab.resultedAt,
      refType: "LabResult",
      refId: lab.id,
      title: lab.title,
      summary: lab.releaseStatus,
      visibility:
        lab.releaseStatus === "RELEASED" ? "ALL_AUTHORIZED" : "CLINICIAN",
    });
    upserted += 1;
  }

  const docs = await prisma.clinicalDocument.findMany({
    where: { patientUserId, deletedAt: null },
    select: { id: true, createdAt: true, title: true },
  });
  for (const doc of docs) {
    await upsertTimelineEvent({
      patientUserId,
      type: "DOCUMENT",
      effectiveAt: doc.createdAt,
      refType: "ClinicalDocument",
      refId: doc.id,
      title: doc.title,
      visibility: "ALL_AUTHORIZED",
    });
    upserted += 1;
  }

  return platformOk({ upserted });
}
