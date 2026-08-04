import type { AiFeedbackRating } from "@prisma/client";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";
import type { AiActor } from "@/actions/ai/_actor";

export type SubmitFeedbackInput = {
  messageId?: string;
  /** When rating a documentation draft, ensures a durable AiMessage target. */
  draftId?: string;
  rating: AiFeedbackRating;
  category?: string;
};

/**
 * Upsert one feedback row per (message, user). Resolves draft targets to an
 * AiMessage so ops feedback ratios stay on AiFeedback (FR-026).
 */
export async function submitFeedback(
  actor: AiActor,
  input: SubmitFeedbackInput,
): Promise<PlatformResult<{ id: string }>> {
  if (actor.role === "ADMIN") {
    return platformFail("FORBIDDEN", "Admin cannot submit clinical feedback");
  }

  let messageId = input.messageId?.trim() || null;

  if (!messageId && input.draftId) {
    const draft = await prisma.aiDraftArtifact.findUnique({
      where: { id: input.draftId },
      select: { id: true, doctorUserId: true, kind: true, content: true },
    });
    if (!draft) return platformFail("NOT_FOUND", "Draft not found");
    if (actor.role !== "DOCTOR" || draft.doctorUserId !== actor.userId) {
      return platformFail("FORBIDDEN", "Not your draft");
    }
    messageId = await ensureDraftFeedbackMessage(actor.userId, draft);
  }

  if (!messageId) {
    return platformFail("VALIDATION_ERROR", "messageId or draftId required");
  }

  const message = await prisma.aiMessage.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });
  if (!message) return platformFail("NOT_FOUND", "Message not found");

  // Feedback is only allowed for the conversation owner (patient chat) or the
  // doctor who owns a draft-feedback conversation (patientUserId = doctor user).
  if (message.conversation.patientUserId !== actor.userId) {
    return platformFail("FORBIDDEN", "Not your message");
  }

  if (message.role !== "ASSISTANT" && message.role !== "SYSTEM_NOTICE") {
    return platformFail("VALIDATION_ERROR", "Feedback only for assistant responses");
  }

  const row = await prisma.aiFeedback.upsert({
    where: {
      messageId_userId: { messageId, userId: actor.userId },
    },
    create: {
      messageId,
      userId: actor.userId,
      rating: input.rating,
      category: input.category?.slice(0, 120) || null,
    },
    update: {
      rating: input.rating,
      category: input.category?.slice(0, 120) || null,
    },
    select: { id: true },
  });

  return platformOk({ id: row.id });
}

async function ensureDraftFeedbackMessage(
  doctorUserId: string,
  draft: { id: string; kind: string; content: unknown },
): Promise<string> {
  const marker = `[draft-feedback:${draft.id}]`;

  const existing = await prisma.aiMessage.findFirst({
    where: {
      content: { startsWith: marker },
      conversation: { patientUserId: doctorUserId, feature: "DOCTOR_SOAP" },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const conversation = await prisma.aiConversation.create({
    data: {
      patientUserId: doctorUserId,
      feature: "DOCTOR_SOAP",
      locale: "EN",
      title: `Draft feedback · ${draft.kind}`,
      status: "ACTIVE",
    },
  });

  const summary =
    typeof draft.content === "object" && draft.content
      ? JSON.stringify(draft.content).slice(0, 2000)
      : String(draft.content ?? "").slice(0, 2000);

  const message = await prisma.aiMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: `${marker}\n${summary}`,
      disclaimerShown: true,
    },
  });

  return message.id;
}
