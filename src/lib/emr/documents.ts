import { randomUUID } from "node:crypto";
import type { ClinicalDocumentKind } from "@prisma/client";
import { assertEmrAccess, type EmrAccessAction, type EmrActor } from "@/domain/emr/access";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { getStorageAdapter } from "@/adapters";
import { getDownloadUrl } from "@/lib/platform/documents";
import { resolveUploadContentType, validateUploadInput } from "@/lib/platform/storage";
import { prisma } from "@/lib/prisma";
import { emrAudit } from "./audit";
import { inChartSearch, textContains, type InChartSearchFilters } from "./search";
import { upsertTimelineEvent } from "./timeline";

function sanitizeDocumentTitle(name: string): string {
  return name.replace(/[^\w.\-()+\s]/g, "_").slice(0, 200);
}

const DOCUMENT_KINDS = new Set<string>([
  "RECORD_ATTACHMENT",
  "LAB_ATTACHMENT",
  "PATIENT_UPLOAD",
  "RECEIPT",
  "REFERRAL",
  "CERTIFICATE",
  "CONSENT_EVIDENCE",
  "IMAGING_REPORT",
  "OTHER",
]);

export async function listDocuments(
  actor: EmrActor,
  patientUserId: string,
  filters: InChartSearchFilters = {},
) {
  const access = await assertEmrAccess(actor, patientUserId, "read");
  if (!access.ok) return access;

  const search = inChartSearch(filters);
  const contains = textContains(search.q);

  const where = {
    patientUserId,
    ...(filters.includeDeleted ? {} : softDeleteWhere()),
    ...(contains
      ? {
          OR: [{ title: contains }, { classification: contains }],
        }
      : {}),
    ...(search.type && DOCUMENT_KINDS.has(search.type)
      ? { kind: search.type as ClinicalDocumentKind }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.clinicalDocument.count({ where }),
    prisma.clinicalDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: search.skip,
      take: search.take,
    }),
  ]);

  return platformOk({
    items,
    total,
    page: search.page,
    pageCount: Math.max(1, Math.ceil(total / search.take)),
  });
}

export async function softDeleteDocument(
  actor: EmrActor,
  input: { documentId: string },
): Promise<PlatformResult<{ id: string }>> {
  const doc = await prisma.clinicalDocument.findUnique({ where: { id: input.documentId } });
  if (!doc || doc.deletedAt) return platformFail("NOT_FOUND", "Document not found");

  const writeAction = actor.role === "PATIENT" ? "write_self" : "write_clinical";
  const access = await assertEmrAccess(actor, doc.patientUserId, writeAction);
  if (!access.ok) return access;

  if (doc.legalHold) {
    return platformFail("CONFLICT", "Document is on legal hold");
  }

  const updated = await prisma.clinicalDocument.update({
    where: { id: doc.id },
    data: { deletedAt: new Date(), deletedByUserId: actor.userId },
  });

  await upsertTimelineEvent({
    patientUserId: doc.patientUserId,
    type: "DOCUMENT",
    effectiveAt: new Date(),
    refType: "ClinicalDocument",
    refId: doc.id,
    title: `${doc.title} (hidden)`,
    actorUserId: actor.userId,
    visibility: "CLINICIAN",
    status: "HIDDEN",
  });

  await emrAudit({
    type: "documents.soft_delete",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: doc.patientUserId,
    meta: { documentId: doc.id },
  });

  return platformOk({ id: updated.id });
}

export async function restoreDocument(
  actor: EmrActor,
  input: { documentId: string },
): Promise<PlatformResult<{ id: string }>> {
  const doc = await prisma.clinicalDocument.findUnique({ where: { id: input.documentId } });
  if (!doc?.deletedAt) return platformFail("NOT_FOUND", "Deleted document not found");

  const writeAction = actor.role === "PATIENT" ? "write_self" : "write_clinical";
  const access = await assertEmrAccess(actor, doc.patientUserId, writeAction);
  if (!access.ok) return access;

  const updated = await prisma.clinicalDocument.update({
    where: { id: doc.id },
    data: { deletedAt: null, deletedByUserId: null },
  });

  await upsertTimelineEvent({
    patientUserId: doc.patientUserId,
    type: "DOCUMENT",
    effectiveAt: new Date(),
    refType: "ClinicalDocument",
    refId: doc.id,
    title: doc.title,
    actorUserId: actor.userId,
    visibility: "ALL_AUTHORIZED",
    status: "ACTIVE",
  });

  await emrAudit({
    type: "documents.restore",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: doc.patientUserId,
    meta: { documentId: doc.id },
  });

  return platformOk({ id: updated.id });
}

/** Short-lived HTTPS download URL via Platform storage (T074 / T105). */
export async function getDocumentDownloadUrl(
  actor: EmrActor,
  input: { documentId: string },
): Promise<PlatformResult<{ url: string; expiresAt: string }>> {
  const doc = await prisma.clinicalDocument.findFirst({
    where: { id: input.documentId, ...softDeleteWhere() },
  });
  if (!doc) return platformFail("NOT_FOUND", "Document not found");

  const access = await assertEmrAccess(actor, doc.patientUserId, "download");
  if (!access.ok) return access;

  const result = await getDownloadUrl({
    userId: actor.userId,
    role: actor.role,
    doctorId: actor.doctorId,
    documentId: doc.id,
  });
  if (!result.ok) return result;

  await emrAudit({
    type: "documents.download",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: doc.patientUserId,
    meta: { documentId: doc.id },
  });

  return result;
}

/**
 * EMR gate for Platform content replacement (T080 / FR-015).
 * Refuses soft-deleted or legal-hold documents before Platform immutability checks.
 */
export async function assertEmrDocumentMutableForReplace(
  actor: EmrActor,
  clinicalDocumentId: string,
): Promise<PlatformResult<{ documentId: string }>> {
  const doc = await prisma.clinicalDocument.findUnique({
    where: { id: clinicalDocumentId },
  });
  if (!doc || doc.deletedAt) return platformFail("NOT_FOUND", "Document not found");

  const access = await assertEmrAccess(actor, doc.patientUserId, "write_clinical");
  if (!access.ok) return access;

  if (doc.legalHold) {
    return platformFail("CONFLICT", "Document is on legal hold");
  }

  return platformOk({ documentId: doc.id });
}

/**
 * Register a new clinical document by uploading its bytes via the Platform storage
 * adapter and creating the metadata row (T074). Patients may attach to their own
 * chart (`write_self`); doctors attach clinical attachments (`write_clinical`).
 */
export async function registerDocument(
  actor: EmrActor,
  input: {
    patientUserId: string;
    kind: ClinicalDocumentKind;
    title: string;
    body: Buffer;
    contentType: string;
    fileName?: string;
    classification?: string | null;
  },
): Promise<PlatformResult<{ id: string }>> {
  const title = input.title.trim();
  if (!title) return platformFail("VALIDATION_ERROR", "Title is required");

  const writeAction: EmrAccessAction = actor.role === "PATIENT" ? "write_self" : "write_clinical";
  const access = await assertEmrAccess(actor, input.patientUserId, writeAction);
  if (!access.ok) return access;

  const fileName = (input.fileName?.trim() || title).slice(0, 200);
  const contentType = resolveUploadContentType(fileName, input.contentType);

  const validation = validateUploadInput({
    fileName,
    contentType,
    sizeBytes: input.body.length,
  });
  if (!validation.ok) return validation;

  const safeTitle = sanitizeDocumentTitle(fileName.includes(".") ? fileName : `${title}.bin`);
  const storageKey = `emr/${input.patientUserId}/${randomUUID()}/${safeTitle}`;

  await getStorageAdapter().upload({
    key: storageKey,
    body: input.body,
    contentType,
  });

  const doc = await prisma.clinicalDocument.create({
    data: {
      patientUserId: input.patientUserId,
      kind: input.kind,
      title,
      contentType,
      storageKey,
      byteSize: input.body.length,
      classification: input.classification?.trim() || null,
    },
  });

  await upsertTimelineEvent({
    patientUserId: input.patientUserId,
    type: "DOCUMENT",
    effectiveAt: doc.createdAt,
    refType: "ClinicalDocument",
    refId: doc.id,
    title: doc.title,
    actorUserId: actor.userId,
    visibility: "ALL_AUTHORIZED",
  });

  await emrAudit({
    type: "documents.register",
    outcome: "SUCCESS",
    actorUserId: actor.userId,
    targetUserId: input.patientUserId,
    meta: { id: doc.id, kind: doc.kind },
  });

  return platformOk({ id: doc.id });
}
