"use server";

import { z } from "zod";
import { getSummary } from "@/lib/emr/summary";
import { resolveEmrActor, toActionResult } from "./_actor";

const patientIdSchema = z.object({
  patientUserId: z.string().cuid(),
});

export async function emrGetSummary(raw: unknown) {
  const parsed = patientIdSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };

  return toActionResult(await getSummary(actor.data, parsed.data.patientUserId));
}
