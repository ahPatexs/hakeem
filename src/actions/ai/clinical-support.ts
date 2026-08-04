"use server";

import { z } from "zod";
import {
  dismissCdsInsight,
  listCdsInsights,
  suggestPrescription,
} from "@/lib/ai/clinical-support";
import { resolveAiActor, toActionResult, type AiActionResult } from "./_actor";

const suggestSchema = z.object({
  patientUserId: z.string().min(1),
  intent: z.string().min(1).max(4000),
});

const listCdsSchema = z.object({
  patientUserId: z.string().min(1),
});

const dismissCdsSchema = z.object({
  insightId: z.string().min(1),
  patientUserId: z.string().min(1),
});

export async function aiSuggestPrescription(
  raw: unknown,
): Promise<
  AiActionResult<
    | {
        noSafeSuggestion: false;
        draftId: string;
        content: {
          lines: Array<{
            medicationName: string;
            dose?: string;
            route?: string;
            frequency?: string;
            duration?: string;
            quantity?: string;
            instructions?: string;
          }>;
          instructions?: string;
        };
        evidence: { chartCategories: string[]; kbSources: string[] };
        conflicts: Array<{ kind: "ALLERGY" | "INTERACTION"; detail: string; evidence: string }>;
      }
    | {
        noSafeSuggestion: true;
        reason: string;
        evidence: { chartCategories: string[]; kbSources: string[] };
        conflicts: Array<{ kind: "ALLERGY" | "INTERACTION"; detail: string; evidence: string }>;
      }
  >
> {
  const parsed = suggestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return toActionResult(actor);

  return toActionResult(await suggestPrescription(actor.data, parsed.data));
}

export async function aiListCdsInsights(
  raw: unknown,
): Promise<
  AiActionResult<{
    items: Array<{
      id: string;
      title: string;
      body: string;
      kind: "ALLERGY" | "INTERACTION" | "HISTORY" | "CARE_GAP";
      evidence: string;
      chartCategories: string[];
    }>;
  }>
> {
  const parsed = listCdsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return toActionResult(actor);

  return toActionResult(await listCdsInsights(actor.data, parsed.data));
}

export async function aiDismissCdsInsight(
  raw: unknown,
): Promise<AiActionResult<{ id: string }>> {
  const parsed = dismissCdsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return toActionResult(actor);

  return toActionResult(await dismissCdsInsight(actor.data, parsed.data));
}
