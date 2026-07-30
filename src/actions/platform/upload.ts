"use server";

import { z } from "zod";
import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import { uploadPatientFile, getUploadScanStatus } from "@/lib/platform/storage";
import { getDownloadUrl } from "@/lib/platform/documents";
import type { PlatformResult } from "@/domain/platform/outcomes";

const uploadSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100),
  purpose: z.string().max(64).optional(),
  base64: z.string().min(1),
});

export type PlatformUploadResult = PlatformResult<{ uploadId: string; scanStatus: "PENDING" }>;

export async function uploadPlatformFile(raw: unknown): Promise<PlatformUploadResult> {
  try {
    const user = await requireRole("PATIENT");
    const parsed = uploadSchema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, code: "VALIDATION_ERROR", message: "Invalid upload payload" };
    }

    const buffer = Buffer.from(parsed.data.base64, "base64");
    return uploadPatientFile({
      userId: user.id,
      file: buffer,
      fileName: parsed.data.fileName,
      contentType: parsed.data.contentType,
      purpose: parsed.data.purpose,
    });
  } catch (error) {
    if (isAuthDomainError(error)) {
      return { ok: false, code: error.code === "FORBIDDEN" ? "FORBIDDEN" : "UNAUTHORIZED" };
    }
    console.error("[platform/upload]", error);
    return { ok: false, code: "INTERNAL_FAILURE" };
  }
}

export async function fetchUploadScanStatus(uploadId: string) {
  try {
    const user = await requireRole("PATIENT");
    const status = await getUploadScanStatus(uploadId, user.id);
    if (!status) return { ok: false as const, code: "NOT_FOUND" as const };
    return { ok: true as const, scanStatus: status };
  } catch (error) {
    if (isAuthDomainError(error)) {
      return { ok: false as const, code: error.code };
    }
    return { ok: false as const, code: "UNKNOWN" as const };
  }
}

export async function requestDocumentDownloadUrl(documentId: string) {
  try {
    const user = await requireRole("PATIENT", "DOCTOR", "ADMIN");
    let doctorId: string | null = null;
    if (user.role === "DOCTOR") {
      const { requireDoctorContext } = await import("@/lib/doctor/context");
      const ctx = await requireDoctorContext();
      doctorId = ctx.doctorId;
    }
    return getDownloadUrl({
      userId: user.id,
      role: user.role,
      doctorId,
      documentId,
    });
  } catch (error) {
    if (isAuthDomainError(error)) {
      return { ok: false as const, code: error.code };
    }
    return { ok: false as const, code: "UNKNOWN" as const };
  }
}
