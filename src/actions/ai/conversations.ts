"use server";

import { z } from "zod";
import { resolveAiActor, toActionResult } from "@/actions/ai/_actor";
import {
  getConversation,
  hideConversation,
  listConversations,
  renameConversation,
  startConversation,
  type ChatFeature,
} from "@/lib/ai/conversations";

const featureSchema = z.enum(["PATIENT_ASSISTANT", "DOCTOR_SOAP", "DOCTOR_SUMMARY"]);

export async function aiListConversations(raw: unknown) {
  const parsed = z
    .object({
      page: z.number().int().positive().optional(),
    })
    .safeParse(raw ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await listConversations(actor.data, parsed.data));
}

export async function aiGetConversation(raw: unknown) {
  const parsed = z
    .object({
      conversationId: z.string().cuid(),
      page: z.number().int().positive().optional(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await getConversation(actor.data, parsed.data));
}

export async function aiStartConversation(raw: unknown) {
  const parsed = z
    .object({
      feature: featureSchema,
      locale: z.enum(["en", "ar"]),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(
    await startConversation(actor.data, {
      feature: parsed.data.feature as ChatFeature,
      locale: parsed.data.locale,
    }),
  );
}

export async function aiRenameConversation(raw: unknown) {
  const parsed = z
    .object({
      conversationId: z.string().cuid(),
      title: z.string().min(1).max(120),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await renameConversation(actor.data, parsed.data));
}

export async function aiHideConversation(raw: unknown) {
  const parsed = z
    .object({
      conversationId: z.string().cuid(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await hideConversation(actor.data, parsed.data));
}
