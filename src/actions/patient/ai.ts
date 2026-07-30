"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient } from "@/actions/patient/_helpers";
import { AuthDomainError } from "@/auth/errors";

const localeSchema = z.enum(["EN", "AR"]).default("AR");

export async function ensureConversation(localeInput?: unknown) {
  const locale = localeSchema.parse(localeInput ?? "AR");

  return withPatient(async (userId) => {
    let conversation = await prisma.aiConversation.findFirst({
      where: { patientUserId: userId },
      orderBy: { updatedAt: "desc" },
    });

    if (!conversation) {
      conversation = await prisma.aiConversation.create({
        data: { patientUserId: userId, locale },
      });
    }

    return conversation;
  });
}

export async function listMessages(conversationId: string) {
  return withPatient(async (userId) => {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, patientUserId: userId },
    });
    if (!conversation) throw new AuthDomainError("FORBIDDEN");

    const messages = await prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });

    return { conversation, messages };
  });
}

export async function saveMessage(input: unknown) {
  const parsed = z
    .object({
      conversationId: z.string().min(1),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().min(1).max(8000),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const conversation = await prisma.aiConversation.findFirst({
      where: { id: parsed.data.conversationId, patientUserId: userId },
    });
    if (!conversation) throw new AuthDomainError("FORBIDDEN");

    const message = await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: parsed.data.role,
        content: parsed.data.content,
      },
    });

    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return message;
  });
}
