"use server";

import { z } from "zod";
import {
  acceptDraft,
  discardDraft,
  generateConsultationSummary,
  generateSoapDraft,
} from "@/lib/ai/drafts";
import { resolveAiActor, toActionResult, type AiActionResult } from "./_actor";

const soapFieldsSchema = z.object({
  subjective: z.string().max(8000).optional(),
  objective: z.string().max(8000).optional(),
  assessment: z.string().max(8000).optional(),
  plan: z.string().max(8000).optional(),
});

const generateSoapSchema = z.object({
  patientUserId: z.string().min(1),
  appointmentId: z.string().min(1),
  doctorInput: z.string().max(4000).optional(),
});

const generateSummarySchema = z.object({
  patientUserId: z.string().min(1),
  appointmentId: z.string().min(1),
  locale: z.enum(["en", "ar"]).optional(),
});

const rxLineSchema = z.object({
  medicationName: z.string().min(1).max(250),
  dose: z.string().max(120).optional(),
  route: z.string().max(120).optional(),
  frequency: z.string().max(120).optional(),
  duration: z.string().max(120).optional(),
  quantity: z.string().max(120).optional(),
  instructions: z.string().max(2000).optional(),
});

const acceptSchema = z.object({
  draftId: z.string().min(1),
  edits: soapFieldsSchema
    .extend({
      body: z.string().max(8000).optional(),
      lines: z.array(rxLineSchema).max(20).optional(),
      instructions: z.string().max(4000).optional(),
    })
    .optional(),
});

const discardSchema = z.object({
  draftId: z.string().min(1),
});

export async function aiGenerateSoapDraft(
  raw: unknown,
): Promise<
  AiActionResult<{
    draftId: string;
    content: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    };
    evidence: { chartCategories: string[]; kbSources: string[] };
  }>
> {
  const parsed = generateSoapSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return toActionResult(actor);

  return toActionResult(await generateSoapDraft(actor.data, parsed.data));
}

export async function aiGenerateConsultationSummary(
  raw: unknown,
): Promise<
  AiActionResult<{
    draftId: string;
    content: { body: string };
    evidence: { chartCategories: string[]; kbSources: string[] };
  }>
> {
  const parsed = generateSummarySchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return toActionResult(actor);

  return toActionResult(await generateConsultationSummary(actor.data, parsed.data));
}

export async function aiAcceptDraft(
  raw: unknown,
): Promise<AiActionResult<{ draftId: string; acceptedIntoId: string }>> {
  const parsed = acceptSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return toActionResult(actor);

  return toActionResult(await acceptDraft(actor.data, parsed.data));
}

export async function aiDiscardDraft(
  raw: unknown,
): Promise<AiActionResult<{ draftId: string }>> {
  const parsed = discardSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const actor = await resolveAiActor();
  if (!actor.ok) return toActionResult(actor);

  return toActionResult(await discardDraft(actor.data, parsed.data));
}
