import type { AiFeatureKey, AiGuardrailTrigger } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { aiAudit } from "./audit";

export type RecordGuardrailInput = {
  trigger: AiGuardrailTrigger;
  feature: AiFeatureKey;
  role: string;
  category?: string | null;
  actorUserId?: string | null;
  /** Never pass message content — category/metadata only. */
};

/** Persist an AiGuardrailEvent (no content) and optionally audit. */
export async function recordGuardrailEvent(input: RecordGuardrailInput): Promise<string> {
  const row = await prisma.aiGuardrailEvent.create({
    data: {
      trigger: input.trigger,
      feature: input.feature,
      role: input.role,
      category: input.category ?? null,
    },
  });

  void aiAudit(
    "guardrail.trigger",
    { userId: input.actorUserId },
    null,
    "SUCCESS",
    { trigger: input.trigger, feature: input.feature, category: input.category ?? null },
  ).catch(() => undefined);

  return row.id;
}

/** Fire-and-forget wrapper. */
export function recordGuardrailEventAsync(input: RecordGuardrailInput): void {
  void recordGuardrailEvent(input).catch((err) => {
    console.error("[ai.guardrail-events] write failed", err);
  });
}
