"use server";

import { z } from "zod";
import { getMedicalRecord, listMedicalRecords } from "@/lib/emr/records";
import { resolveEmrActor, toActionResult } from "./_actor";

export async function emrGetMedicalRecord(raw: unknown) {
  const schema = z.object({ recordId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await getMedicalRecord(actor.data, parsed.data.recordId));
}

export async function emrListMedicalRecords(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    page: z.number().int().min(1).optional(),
    q: z.string().max(200).optional(),
    tab: z.enum(["notes", "files", "all"]).optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  const { patientUserId, ...filters } = parsed.data;
  return toActionResult(await listMedicalRecords(actor.data, patientUserId, filters));
}
