"use server";

import { z } from "zod";
import { resolveAiActor, toActionResult } from "@/actions/ai/_actor";
import {
  dismissRecommendation,
  listEducationContent,
  listRecommendations,
} from "@/lib/ai/recommendations";

export async function aiListRecommendations(raw: unknown = {}) {
  const parsed = z
    .object({
      locale: z.enum(["en", "ar"]).optional(),
    })
    .safeParse(raw ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await listRecommendations(actor.data, parsed.data));
}

export async function aiDismissRecommendation(raw: unknown) {
  const parsed = z
    .object({
      recommendationId: z.string().cuid(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await dismissRecommendation(actor.data, parsed.data));
}

/** Locale-filtered KB education list for the health page (not in §4 contract table). */
export async function aiListEducation(raw: unknown) {
  const parsed = z
    .object({
      locale: z.enum(["en", "ar"]),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await listEducationContent(actor.data, parsed.data));
}
