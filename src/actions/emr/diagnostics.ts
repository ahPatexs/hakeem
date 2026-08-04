"use server";

import { z } from "zod";
import {
  listLabResults,
  releaseLabToPatient,
  retractLab,
  getLabResult,
  listImagingResults,
} from "@/lib/emr/diagnostics";
import { resolveEmrActor, toActionResult } from "./_actor";

export async function emrListLabResults(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    q: z.string().max(200).optional(),
    page: z.number().int().min(1).optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  const { patientUserId, ...filters } = parsed.data;
  return toActionResult(await listLabResults(actor.data, patientUserId, filters));
}

export async function emrListImagingResults(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    q: z.string().max(200).optional(),
    page: z.number().int().min(1).optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  const { patientUserId, ...filters } = parsed.data;
  return toActionResult(await listImagingResults(actor.data, patientUserId, filters));
}

export async function emrGetLabResult(raw: unknown) {
  const schema = z.object({ labResultId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await getLabResult(actor.data, parsed.data.labResultId));
}

export async function emrReleaseLabToPatient(raw: unknown) {
  const schema = z.object({ labResultId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await releaseLabToPatient(actor.data, parsed.data));
}

export async function emrRetractLab(raw: unknown) {
  const schema = z.object({ labResultId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await retractLab(actor.data, parsed.data));
}
