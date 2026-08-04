"use server";

import { z } from "zod";
import { listDiagnoses, upsertDiagnosis } from "@/lib/emr/diagnoses";
import { resolveEmrActor, toActionResult } from "./_actor";

export async function emrListDiagnoses(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    q: z.string().max(200).optional(),
    status: z.string().max(32).optional(),
    page: z.number().int().min(1).optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  const { patientUserId, ...filters } = parsed.data;
  return toActionResult(await listDiagnoses(actor.data, patientUserId, filters));
}

export async function emrUpsertDiagnosis(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    id: z.string().cuid().optional(),
    display: z.string().min(1).max(300),
    icd10Code: z.string().max(32).nullable().optional(),
    status: z.string().max(32).optional(),
    appointmentId: z.string().cuid().nullable().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await upsertDiagnosis(actor.data, parsed.data));
}
