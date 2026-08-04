"use server";

import { z } from "zod";
import { resolveAiActor, toActionResult } from "@/actions/ai/_actor";
import {
  answerSymptomStep,
  attachSessionToBooking,
  getSymptomSession,
  listSymptomSessions,
  startSymptomSession,
} from "@/lib/ai/symptom";

export async function aiStartSymptomSession(raw: unknown) {
  const parsed = z
    .object({
      locale: z.enum(["en", "ar"]),
      complaint: z.string().min(1).max(4000),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await startSymptomSession(actor.data, parsed.data));
}

export async function aiAnswerSymptomStep(raw: unknown) {
  const parsed = z
    .object({
      sessionId: z.string().cuid(),
      answer: z.string().min(1).max(4000),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await answerSymptomStep(actor.data, parsed.data));
}

export async function aiGetSymptomSession(raw: unknown) {
  const parsed = z
    .object({
      sessionId: z.string().cuid(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await getSymptomSession(actor.data, parsed.data));
}

export async function aiListSymptomSessions(raw?: unknown) {
  const parsed = z
    .object({
      page: z.number().int().positive().optional(),
    })
    .optional()
    .safeParse(raw ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await listSymptomSessions(actor.data, parsed.data ?? {}));
}

export async function aiAttachSessionToBooking(raw: unknown) {
  const parsed = z
    .object({
      sessionId: z.string().cuid(),
      appointmentId: z.string().cuid(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return { ok: false as const, code: actor.code };
  return toActionResult(await attachSessionToBooking(actor.data, parsed.data));
}
