import { createHmac, timingSafeEqual } from "node:crypto";
import type { UploadScanStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStorageAdapter } from "@/adapters";
import {
  canAccessDocument,
  isSignedClinicalImmutable,
  type DocumentAccessRole,
} from "@/domain/platform/documents";
import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { requireAuthSecret } from "@/lib/env";
import { platformAudit } from "@/lib/platform/audit";

export const DOWNLOAD_URL_MAX_AGE_SEC = 15 * 60;

export type StoredFileRef =
  | { kind: "upload"; id: string; patientUserId: string; storageKey: string; scanStatus: UploadScanStatus }
  | { kind: "clinical"; id: string; patientUserId: string; storageKey: string };

const ALLOWED_DOWNLOAD_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
]);

export async function resolveStoredFile(documentId: string): Promise<StoredFileRef | null> {
  const upload = await prisma.patientUpload.findUnique({ where: { id: documentId } });
  if (upload) {
    return {
      kind: "upload",
      id: upload.id,
      patientUserId: upload.patientUserId,
      storageKey: upload.storageKey,
      scanStatus: upload.scanStatus,
    };
  }

  const clinical = await prisma.clinicalDocument.findUnique({ where: { id: documentId } });
  if (clinical) {
    return {
      kind: "clinical",
      id: clinical.id,
      patientUserId: clinical.patientUserId,
      storageKey: clinical.storageKey,
    };
  }

  return null;
}

function toAccessRole(role: UserRole): DocumentAccessRole | null {
  if (role === "PATIENT" || role === "DOCTOR" || role === "ADMIN") return role;
  return null;
}

export async function assertFileAccess(
  actorUserId: string,
  actorRole: UserRole,
  file: StoredFileRef,
  doctorId?: string | null,
): Promise<boolean> {
  const accessRole = toAccessRole(actorRole);
  if (!accessRole) return false;

  let hasCare = false;
  if (accessRole === "DOCTOR" && doctorId) {
    hasCare = await hasCareRelationship(doctorId, file.patientUserId);
  }

  return canAccessDocument(actorUserId, file.patientUserId, accessRole, {
    scanStatus: file.kind === "upload" ? file.scanStatus : "CLEAN",
    hasCareRelationship: hasCare,
  });
}

export function signDownloadUrl(fileId: string, expiresAtSec: number): string {
  const secret = requireAuthSecret();
  const sig = createHmac("sha256", secret).update(`${fileId}:${expiresAtSec}`).digest("hex");
  return `/api/platform/files/${encodeURIComponent(fileId)}?exp=${expiresAtSec}&sig=${sig}`;
}

export function verifyDownloadSignature(fileId: string, expiresAtSec: number, signature: string): boolean {
  if (!Number.isFinite(expiresAtSec) || expiresAtSec <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  const secret = requireAuthSecret();
  const expected = createHmac("sha256", secret).update(`${fileId}:${expiresAtSec}`).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function getDownloadUrl(input: {
  userId: string;
  role: UserRole;
  doctorId?: string | null;
  documentId: string;
}): Promise<PlatformResult<{ url: string; expiresAt: string }>> {
  const file = await resolveStoredFile(input.documentId);
  if (!file) return platformFail("NOT_FOUND", "Document not found");

  const allowed = await assertFileAccess(input.userId, input.role, file, input.doctorId);
  if (!allowed) return platformFail("FORBIDDEN", "Access denied");

  const expiresAtSec = Math.floor(Date.now() / 1000) + DOWNLOAD_URL_MAX_AGE_SEC;
  const url = signDownloadUrl(file.id, expiresAtSec);

  await platformAudit({
    type: "platform.document.download_url",
    outcome: "SUCCESS",
    actorUserId: input.userId,
    targetUserId: file.patientUserId,
    meta: { documentId: file.id, kind: file.kind },
  });

  return platformOk({ url, expiresAt: new Date(expiresAtSec * 1000).toISOString() });
}

/**
 * FR-015: refuse silent overwrite of storage bytes tied to a signed clinical artifact.
 * Amendments must create a new clinical document / version via clinical workflows.
 * All clinical storage mutations MUST go through this function (no direct adapter overwrite).
 */
export async function replaceClinicalDocumentContent(input: {
  clinicalDocumentId: string;
  body: Buffer;
  contentType: string;
  actorUserId: string;
}): Promise<PlatformResult<{ storageKey: string }>> {
  const clinical = await prisma.clinicalDocument.findUnique({
    where: { id: input.clinicalDocumentId },
  });
  if (!clinical) return platformFail("NOT_FOUND", "Clinical document not found");

  const signedRx = await prisma.prescription.findFirst({
    where: { documentId: input.clinicalDocumentId, signedAt: { not: null } },
    select: { signedAt: true },
  });
  if (signedRx && isSignedClinicalImmutable(signedRx.signedAt)) {
    return platformFail("CONFLICT", "Signed clinical document is immutable");
  }

  // Also block when any linked SOAP/summary for the same patient+document is signed
  // via medical record association.
  const medical = await prisma.medicalRecord.findFirst({
    where: { documentId: input.clinicalDocumentId },
    select: { id: true },
  });
  if (medical) {
    // Medical records that point at a signed prescription document are immutable.
    const linkedSigned = await prisma.prescription.count({
      where: { documentId: input.clinicalDocumentId, signedAt: { not: null } },
    });
    if (linkedSigned > 0) {
      return platformFail("CONFLICT", "Signed clinical document is immutable");
    }
  }

  const uploaded = await getStorageAdapter().upload({
    key: clinical.storageKey,
    body: input.body,
    contentType: input.contentType,
  });

  await platformAudit({
    type: "platform.document.replace_content",
    outcome: "SUCCESS",
    actorUserId: input.actorUserId,
    targetUserId: clinical.patientUserId,
    meta: { clinicalDocumentId: clinical.id },
  });

  return platformOk({ storageKey: uploaded.key });
}

export async function assertSignedArtifactMutable(input: {
  kind: "prescription" | "soap" | "summary";
  id: string;
}): Promise<PlatformResult<void>> {
  if (input.kind === "prescription") {
    const row = await prisma.prescription.findUnique({
      where: { id: input.id },
      select: { signedAt: true },
    });
    if (!row) return platformFail("NOT_FOUND", "Prescription not found");
    if (isSignedClinicalImmutable(row.signedAt)) {
      return platformFail("CONFLICT", "Signed prescription is immutable");
    }
    return platformOk(undefined);
  }
  if (input.kind === "soap") {
    const row = await prisma.soapNote.findUnique({
      where: { id: input.id },
      select: { signedAt: true },
    });
    if (!row) return platformFail("NOT_FOUND", "SOAP note not found");
    if (isSignedClinicalImmutable(row.signedAt)) {
      return platformFail("CONFLICT", "Signed SOAP note is immutable");
    }
    return platformOk(undefined);
  }
  const row = await prisma.clinicalSummary.findUnique({
    where: { id: input.id },
    select: { signedAt: true },
  });
  if (!row) return platformFail("NOT_FOUND", "Clinical summary not found");
  if (isSignedClinicalImmutable(row.signedAt)) {
    return platformFail("CONFLICT", "Signed clinical summary is immutable");
  }
  return platformOk(undefined);
}

export async function streamStoredFile(documentId: string): Promise<
  PlatformResult<{
    body: Buffer;
    contentType: string;
    fileName: string;
  }>
> {
  const file = await resolveStoredFile(documentId);
  if (!file) return platformFail("NOT_FOUND", "Document not found");

  if (file.kind === "upload" && file.scanStatus !== "CLEAN") {
    return platformFail("FORBIDDEN", "Document unavailable");
  }

  const downloaded = await getStorageAdapter().download(file.storageKey);
  const contentType = ALLOWED_DOWNLOAD_TYPES.has(downloaded.contentType)
    ? downloaded.contentType
    : "application/octet-stream";

  return platformOk({
    body: downloaded.body,
    contentType,
    fileName: file.kind === "upload" ? documentId : `${documentId}.bin`,
  });
}
