"use server";

import { z } from "zod";
import { listPlans, upsertPlan, publishPlan } from "@/lib/emr/plans";
import { resolveEmrActor, toActionResult } from "./_actor";

export async function emrListPlans(raw: unknown) {
  const schema = z.object({ patientUserId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await listPlans(actor.data, parsed.data.patientUserId));
}

export async function emrUpsertPlan(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    id: z.string().cuid().optional(),
    title: z.string().min(1).max(300),
    kind: z.string().max(50).optional(),
    goals: z.unknown().nullable().optional(),
    interventions: z.unknown().nullable().optional(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  const { goals, interventions, ...rest } = parsed.data;
  return toActionResult(
    await upsertPlan(actor.data, {
      ...rest,
      goals: goals as never,
      interventions: interventions as never,
    }),
  );
}

export async function emrPublishPlan(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    planId: z.string().cuid(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await publishPlan(actor.data, parsed.data));
}
