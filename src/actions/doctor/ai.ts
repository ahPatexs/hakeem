"use server";

import { prisma } from "@/lib/prisma";
import { withDoctor } from "./_helpers";
import { DomainRuleError } from "@/domain/doctor/errors";
import { AI_RATE_LIMIT_PER_HOUR } from "@/domain/doctor/dashboard";
import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { doctorAiSendSchema, cuidSchema } from "@/lib/doctor/schemas";
import { stubAiAssistantAdapter } from "@/adapters/stub-ai";
import { auditDoctorEvent } from "@/lib/doctor/phi-audit";
import { getLocale } from "next-intl/server";
import type { z } from "zod";

const MODE_PROMPTS: Record<string, string> = {
  MEDICAL: "Clinical decision-support assistant. Advisory only; the physician retains full responsibility.",
  DOCUMENTATION: "Draft clinical documentation (SOAP) from the encounter context. Output is a draft requiring physician review.",
  PRESCRIPTION: "Draft prescription suggestions. Never authoritative; physician must review and sign.",
};

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
 * Send a message to the doctor AI assistant (FR-018).
 * Rate-limited per doctor; patient context only with a care relationship.
 * AI output is always a suggestion — accept/discard is explicit (FR-019).
 */
export async function sendAiMessage(raw: z.input<typeof doctorAiSendSchema>) {
  const input = doctorAiSendSchema.parse(raw);
  return withDoctor(async (ctx) => {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.doctorAiMessage.count({
      where: {
        role: "user",
        createdAt: { gte: hourAgo },
        conversation: { doctorUserId: ctx.userId },
      },
    });
    if (recentCount >= AI_RATE_LIMIT_PER_HOUR) throw new DomainRuleError("RATE_LIMITED");

    if (input.patientUserId) {
      const allowed = await hasCareRelationship(ctx.doctorId, input.patientUserId);
      if (!allowed) throw new DomainRuleError("NOT_FOUND");
    }

    const locale = ((await getLocale()) === "ar" ? "ar" : "en") as "en" | "ar";

    let conversation;
    if (input.conversationId) {
      conversation = await prisma.doctorAiConversation.findFirst({
        where: { id: input.conversationId, doctorUserId: ctx.userId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 50 } },
      });
      if (!conversation) throw new DomainRuleError("NOT_FOUND");
    } else {
      conversation = await prisma.doctorAiConversation.create({
        data: {
          doctorUserId: ctx.userId,
          mode: input.mode,
          patientUserId: input.patientUserId ?? null,
          appointmentId: input.appointmentId ?? null,
          locale: locale === "ar" ? "AR" : "EN",
        },
        include: { messages: true },
      });
    }

    await prisma.doctorAiMessage.create({
      data: { conversationId: conversation.id, role: "user", content: input.content },
    });

    const history = [
      { role: "system" as const, content: MODE_PROMPTS[input.mode] },
      ...conversation.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: input.content },
    ];

    const result = await stubAiAssistantAdapter.chat({
      conversationId: conversation.id,
      messages: history,
      locale,
    });

    const assistantMessage = await prisma.doctorAiMessage.create({
      data: { conversationId: conversation.id, role: "assistant", content: result.content },
    });
    await prisma.doctorAiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    await auditDoctorEvent("doctor.ai.generate", ctx.userId, {
      conversationId: conversation.id,
      mode: input.mode,
      patientUserId: input.patientUserId ?? null,
    });

    return {
      conversationId: conversation.id,
      message: {
        id: assistantMessage.id,
        role: "assistant" as const,
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
      disclaimer: result.disclaimer,
    };
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
