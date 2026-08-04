"use server";

import { z } from "zod";
import { listEncounters, getEncounter } from "@/lib/emr/encounters";
import { resolveEmrActor, toActionResult } from "./_actor";

export async function emrListEncounters(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    status: z.string().max(32).optional(),
    page: z.number().int().min(1).optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  const { patientUserId, ...filters } = parsed.data;
  return toActionResult(await listEncounters(actor.data, patientUserId, filters));
}

export async function emrGetEncounter(raw: unknown) {
  const schema = z.object({ appointmentId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await getEncounter(actor.data, parsed.data.appointmentId));
}
