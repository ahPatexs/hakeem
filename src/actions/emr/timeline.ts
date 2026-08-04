"use server";

import { z } from "zod";
import { listTimeline } from "@/lib/emr/timeline";
import { resolveEmrActor, toActionResult } from "./_actor";

const timelineTypeSchema = z.enum([
  "ENCOUNTER",
  "APPOINTMENT",
  "PRESCRIPTION",
  "LAB",
  "IMAGING",
  "DOCUMENT",
  "CONSENT",
  "DIAGNOSIS",
  "PLAN",
  "NOTE",
  "SYSTEM",
]);

export async function emrListTimeline(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    types: z.array(timelineTypeSchema).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    cursor: z.string().cuid().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  const { patientUserId, ...filters } = parsed.data;
  return toActionResult(await listTimeline(patientUserId, actor.data, filters));
}
