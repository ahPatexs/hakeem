import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getStorageAdapter } from "@/adapters";
import { enqueue } from "@/lib/platform/jobs";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { isAllowedImageContentType } from "@/lib/platform/image";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const ALLOWED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
]);

const EXT_CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".txt": "text/plain",
};

/** Prefer browser MIME; fall back to extension when empty/octet-stream. */
export function resolveUploadContentType(fileName: string, contentType?: string | null): string {
  const ct = (contentType ?? "").trim().toLowerCase();
  if (ct && ct !== "application/octet-stream") return ct;
  const lower = fileName.toLowerCase();
  const dot = lower.lastIndexOf(".");
  if (dot >= 0) {
    const ext = lower.slice(dot);
    if (EXT_CONTENT_TYPES[ext]) return EXT_CONTENT_TYPES[ext]!;
  }
  return ct || "application/octet-stream";
}

export type UploadPatientFileInput = {
  userId: string;
  file: Buffer;
  fileName: string;
  contentType: string;
  purpose?: string;
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^\w.\-()+\s]/g, "_").slice(0, 200);
}

export function validateUploadInput(input: {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}): PlatformResult<void> {
  if (!input.fileName.trim()) {
    return platformFail("VALIDATION_ERROR", "fileName is required");
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_UPLOAD_BYTES) {
    return platformFail("VALIDATION_ERROR", `File must be ≤ ${MAX_UPLOAD_BYTES} bytes`);
  }
  const resolved = resolveUploadContentType(input.fileName, input.contentType);
  if (!ALLOWED_UPLOAD_TYPES.has(resolved) && !isAllowedImageContentType(resolved)) {
    return platformFail(
      "VALIDATION_ERROR",
      "Unsupported file type. Use PDF, JPG, PNG, WEBP, GIF, or TXT.",
    );
  }
  return platformOk(undefined);
}

export async function uploadPatientFile(
  input: UploadPatientFileInput,
): Promise<PlatformResult<{ uploadId: string; scanStatus: "PENDING" }>> {
  const validation = validateUploadInput({
    fileName: input.fileName,
    contentType: input.contentType,
    sizeBytes: input.file.length,
  });
  if (!validation.ok) return validation;

  let body = input.file;
  let contentType = resolveUploadContentType(input.fileName, input.contentType);
  if (isAllowedImageContentType(contentType)) {
    const { optimizeImageBuffer } = await import("@/lib/platform/image");
    const optimized = optimizeImageBuffer({ body: input.file, contentType });
    if (!optimized.ok) return optimized;
    body = optimized.data.body;
    contentType = optimized.data.contentType;
  }

  const safeName = sanitizeFileName(input.fileName);
  const storageKey = `patient/${input.userId}/${randomUUID()}/${safeName}`;

  await getStorageAdapter().upload({
    key: storageKey,
    body,
    contentType,
  });

  const upload = await prisma.patientUpload.create({
    data: {
      patientUserId: input.userId,
      fileName: safeName,
      contentType,
      sizeBytes: body.length,
      storageKey,
      scanStatus: "PENDING",
      purpose: input.purpose ?? "other",
    },
  });

  const job = await enqueue({
    type: "MALWARE_SCAN",
    idempotencyKey: `malware:${upload.id}`,
    payload: {
      uploadId: upload.id,
      documentId: upload.id,
      fileName: safeName,
    },
  });
  if (!job.ok) {
    return platformFail(job.code, job.message ?? "Failed to enqueue malware scan");
  }

  return platformOk({ uploadId: upload.id, scanStatus: "PENDING" });
}

export async function getUploadScanStatus(uploadId: string, userId: string) {
  const row = await prisma.patientUpload.findFirst({
    where: { id: uploadId, patientUserId: userId },
    select: { scanStatus: true },
  });
  return row?.scanStatus ?? null;
}

export async function runMalwareScanJob(payload: {
  uploadId?: string;
  documentId?: string;
  fileName?: string;
}): Promise<void> {
  const uploadId = payload.uploadId ?? payload.documentId;
  if (!uploadId) throw new Error("MISSING_JOB_FIELD:uploadId");

  const upload = await prisma.patientUpload.findUnique({ where: { id: uploadId } });
  if (!upload) throw new Error("UPLOAD_NOT_FOUND");
  if (upload.scanStatus !== "PENDING") return;

  const { getMalwareAdapter } = await import("@/adapters");
  const storage = getStorageAdapter();
  const downloaded = await storage.download(upload.storageKey);
  const result = await getMalwareAdapter().scan({
    buffer: downloaded.body,
    fileName: upload.fileName,
    contentType: upload.contentType,
  });

  if (result.status === "clean") {
    await prisma.patientUpload.update({
      where: { id: upload.id },
      data: { scanStatus: "CLEAN" },
    });
    return;
  }

  await prisma.patientUpload.update({
    where: { id: upload.id },
    data: { scanStatus: "REJECTED" },
  });
  await storage.delete(upload.storageKey).catch(() => undefined);
}
