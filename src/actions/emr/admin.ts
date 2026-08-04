"use server";

import { z } from "zod";
import { getOversightSummary, setLegalHold } from "@/lib/emr/admin";
import { searchPatientsForAdmin } from "@/lib/emr/search";
import { resolveEmrActor, toActionResult } from "./_actor";

export async function emrAdminGetChartOversight(raw: unknown) {
  const schema = z.object({ patientUserId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await getOversightSummary(actor.data, parsed.data.patientUserId));
}

export async function emrAdminSetLegalHold(raw: unknown) {
  const schema = z.object({
    documentId: z.string().cuid(),
    hold: z.boolean(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await setLegalHold(actor.data, parsed.data));
}

export async function emrAdminSearchPatients(raw: unknown) {
  const schema = z.object({
    q: z.string().max(200).optional(),
    page: z.number().int().min(1).optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await searchPatientsForAdmin(actor.data, parsed.data));
}
