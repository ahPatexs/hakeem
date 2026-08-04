"use server";

import { z } from "zod";
import { resolveAiActor, toActionResult } from "@/actions/ai/_actor";
import { submitFeedback } from "@/lib/ai/feedback";

const schema = z
  .object({
    messageId: z.string().cuid().optional(),
    draftId: z.string().cuid().optional(),
    rating: z.enum(["HELPFUL", "NOT_HELPFUL", "FLAGGED"]),
    category: z.string().max(120).optional(),
  })
  .refine((v) => Boolean(v.messageId || v.draftId), {
    message: "messageId or draftId required",
  });

export async function aiSubmitFeedback(raw: unknown) {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await submitFeedback(actor.data, parsed.data));
}
