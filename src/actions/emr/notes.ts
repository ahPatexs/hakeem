"use server";

import { z } from "zod";
import {
  getSoapNote,
  saveSoapDraft,
  signSoapNote,
  amendSoapNote,
  listDoctorNotes,
  saveDoctorNote,
  signDoctorNote,
} from "@/lib/emr/notes";
import { resolveEmrActor, toActionResult } from "./_actor";

export async function emrGetSoap(raw: unknown) {
  const schema = z.object({ noteId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await getSoapNote(actor.data, parsed.data.noteId));
}

export async function emrSaveSoapDraft(raw: unknown) {
  const schema = z.object({
    appointmentId: z.string().cuid(),
    noteId: z.string().cuid().optional(),
    expectedVersion: z.number().int().positive().optional(),
    subjective: z.string().max(20_000),
    objective: z.string().max(20_000),
    assessment: z.string().max(20_000),
    plan: z.string().max(20_000),
    aiAssisted: z.boolean().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await saveSoapDraft(actor.data, parsed.data));
}

export async function emrSignSoap(raw: unknown) {
  const schema = z.object({
    noteId: z.string().cuid(),
    expectedVersion: z.number().int().positive(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await signSoapNote(actor.data, parsed.data));
}

export async function emrAmendSoap(raw: unknown) {
  const schema = z.object({
    noteId: z.string().cuid(),
    reason: z.string().min(1).max(1000),
    subjective: z.string().max(20_000),
    objective: z.string().max(20_000),
    assessment: z.string().max(20_000),
    plan: z.string().max(20_000),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await amendSoapNote(actor.data, parsed.data));
}

// ── Doctor free-text notes (T124) ─────────────────────────────────────────

export async function emrListDoctorNotes(raw: unknown) {
  const schema = z.object({ patientUserId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await listDoctorNotes(actor.data, parsed.data.patientUserId));
}

export async function emrSaveDoctorNote(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    appointmentId: z.string().cuid().nullable().optional(),
    noteId: z.string().cuid().optional(),
    expectedVersion: z.number().int().positive().optional(),
    body: z.string().max(20_000),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await saveDoctorNote(actor.data, parsed.data));
}

export async function emrSignDoctorNote(raw: unknown) {
  const schema = z.object({
    noteId: z.string().cuid(),
    expectedVersion: z.number().int().positive(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await signDoctorNote(actor.data, parsed.data));
}
