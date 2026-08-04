"use server";

import { prisma } from "@/lib/prisma";
import { withDoctor } from "./_helpers";
import { DomainRuleError } from "@/domain/doctor/errors";
import { doctorAiSendSchema, cuidSchema } from "@/lib/doctor/schemas";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";
import type { z } from "zod";

export async function listAiConversations() {
  return withDoctor(async (ctx) =>
    prisma.doctorAiConversation.findMany({
      where: { doctorUserId: ctx.userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
  );
}

export async function getAiConversation(raw: { conversationId: string }) {
  const conversationId = cuidSchema.parse(raw.conversationId);
  return withDoctor(async (ctx) => {
    const convo = await prisma.doctorAiConversation.findFirst({
      where: { id: conversationId, doctorUserId: ctx.userId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
    });
    if (!convo) throw new DomainRuleError("NOT_FOUND");
    return convo;
  });
}

/**
 * @deprecated Legacy doctor AI send — Module 7 is the sole entry.
 * Use POST `/api/ai/chat` (DOCTOR_SOAP) or `aiGenerateSoapDraft` / clinical-support actions.
 * Kept only so stale callers receive an explicit failure instead of bypassing metering/guardrails.
 */
export async function sendAiMessage(_raw: z.input<typeof doctorAiSendSchema>) {
  return withDoctor(async () => {
    throw new DomainRuleError(
      "VALIDATION_ERROR",
      "Deprecated: use Module 7 /api/ai/chat or lib/ai draft facades",
    );
  });
}

/** Audit an explicit accept/discard of AI output into clinical fields (FR-019). */
export async function recordAiDecision(raw: {
  conversationId: string;
  decision: "accept" | "discard";
  target: string;
}) {
  const conversationId = cuidSchema.parse(raw.conversationId);
  const decision = raw.decision === "accept" ? "accept" : "discard";
  return withDoctor(async (ctx) => {
    const convo = await prisma.doctorAiConversation.findFirst({
      where: { id: conversationId, doctorUserId: ctx.userId },
      select: { id: true },
    });
    if (!convo) throw new DomainRuleError("NOT_FOUND");
    await auditDoctorEvent(decision === "accept" ? "doctor.ai.accept" : "doctor.ai.discard", ctx.userId, {
      conversationId,
      target: String(raw.target).slice(0, 100),
    });
    return { recorded: true };
  });
}
