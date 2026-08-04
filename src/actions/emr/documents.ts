"use server";

import { z } from "zod";
import {
  listDocuments,
  softDeleteDocument,
  restoreDocument,
  getDocumentDownloadUrl,
  registerDocument,
} from "@/lib/emr/documents";
import { resolveEmrActor, toActionResult } from "./_actor";

const CLINICAL_DOCUMENT_KINDS = [
  "RECORD_ATTACHMENT",
  "LAB_ATTACHMENT",
  "PATIENT_UPLOAD",
  "RECEIPT",
  "REFERRAL",
  "CERTIFICATE",
  "CONSENT_EVIDENCE",
  "IMAGING_REPORT",
  "OTHER",
] as const;

export async function emrListDocuments(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    q: z.string().max(200).optional(),
    type: z.string().max(64).optional(),
    page: z.number().int().min(1).optional(),
    includeDeleted: z.boolean().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  const { patientUserId, ...filters } = parsed.data;
  // Patients may only includeDeleted for their own soft-hidden items; doctors/admin for care/compliance.
  if (filters.includeDeleted && actor.data.role === "PATIENT") {
    // allowed for own chart restore path
  }
  return toActionResult(await listDocuments(actor.data, patientUserId, filters));
}

export async function emrSoftDeleteDocument(raw: unknown) {
  const schema = z.object({ documentId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await softDeleteDocument(actor.data, parsed.data));
}

export async function emrRestoreDocument(raw: unknown) {
  const schema = z.object({ documentId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await restoreDocument(actor.data, parsed.data));
}

export async function emrGetDocumentDownloadUrl(raw: unknown) {
  const schema = z.object({ documentId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await getDocumentDownloadUrl(actor.data, parsed.data));
}

export async function emrRegisterDocument(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    kind: z.enum(CLINICAL_DOCUMENT_KINDS),
    title: z.string().min(1).max(200),
    contentType: z.string().min(1).max(100),
    base64: z.string().min(1),
    classification: z.string().max(120).optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  const { base64, ...rest } = parsed.data;
  const body = Buffer.from(base64, "base64");
  return toActionResult(await registerDocument(actor.data, { ...rest, body }));
}
