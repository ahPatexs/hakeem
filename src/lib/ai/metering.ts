import type { AiFeatureKey, AiUsageOutcome, LocaleCode } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** USD per 1M tokens — code-maintained pricing table (approx OpenAI list). */
export const MODEL_PRICING: Record<
  string,
  { inputPer1M: number; outputPer1M: number }
> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },
  "text-embedding-3-small": { inputPer1M: 0.02, outputPer1M: 0 },
};

export function estimateCostUsd(input: {
  modelName: string;
  promptTokens: number;
  completionTokens: number;
}): number {
  const pricing = MODEL_PRICING[input.modelName] ?? MODEL_PRICING["gpt-4o-mini"];
  const promptCost = (input.promptTokens / 1_000_000) * pricing.inputPer1M;
  const completionCost = (input.completionTokens / 1_000_000) * pricing.outputPer1M;
  return Number((promptCost + completionCost).toFixed(6));
}

export type RecordUsageInput = {
  feature: AiFeatureKey;
  role: string;
  locale: "en" | "ar" | LocaleCode;
  userId?: string | null;
  modelConfigId?: string | null;
  promptVersionId?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  outcome: AiUsageOutcome;
  modelName?: string;
};

function toLocale(locale: "en" | "ar" | LocaleCode): LocaleCode {
  if (locale === "en" || locale === "EN") return "EN";
  if (locale === "ar" || locale === "AR") return "AR";
  return "EN";
}

async function writeUsage(input: RecordUsageInput): Promise<void> {
  const promptTokens = input.promptTokens ?? 0;
  const completionTokens = input.completionTokens ?? 0;
  const estimatedCostUsd = estimateCostUsd({
    modelName: input.modelName ?? "gpt-4o-mini",
    promptTokens,
    completionTokens,
  });

  await prisma.aiUsageEvent.create({
    data: {
      feature: input.feature,
      role: input.role,
      locale: toLocale(input.locale),
      userId: input.userId ?? null,
      modelConfigId: input.modelConfigId ?? null,
      promptVersionId: input.promptVersionId ?? null,
      promptTokens,
      completionTokens,
      latencyMs: input.latencyMs ?? 0,
      outcome: input.outcome,
      estimatedCostUsd: new Prisma.Decimal(estimatedCostUsd),
    },
  });
}

/** Fire-and-forget usage write — never throws into the hot path. */
export function recordUsage(input: RecordUsageInput): void {
  void writeUsage(input).catch((err) => {
    console.error("[ai.metering] recordUsage failed", err);
  });
}

/** Awaitable variant for tests / scripts. */
export async function recordUsageAwait(input: RecordUsageInput): Promise<void> {
  await writeUsage(input);
}
