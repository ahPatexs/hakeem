"use server";

import { z } from "zod";
import { listConsentState, acknowledgeConsent, withdrawConsent, requireConsent } from "@/lib/emr/consents";
import { resolveEmrActor, toActionResult } from "./_actor";

export async function emrListConsentState(raw: unknown) {
  const schema = z.object({ patientUserId: z.string().cuid() });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await listConsentState(actor.data, parsed.data.patientUserId));
}

export async function emrAcknowledgeConsent(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    typeCode: z.string().min(1).max(64),
    textVersionId: z.string().cuid(),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await acknowledgeConsent(actor.data, parsed.data));
}

export async function emrWithdrawConsent(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    typeCode: z.string().min(1).max(64),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await withdrawConsent(actor.data, parsed.data));
}

export async function emrRequireConsent(raw: unknown) {
  const schema = z.object({
    patientUserId: z.string().cuid(),
    typeCode: z.string().min(1).max(64),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  const actor = await resolveEmrActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await requireConsent(actor.data, parsed.data));
}
