import { prisma } from "@/lib/prisma";
import { getSmsAdapter } from "@/adapters";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";

export type SendSmsInput = {
  to: string;
  body: string;
  purpose: string;
  idempotencyKey: string;
  recipientUserId?: string;
  relatedNotificationId?: string;
};

export async function sendSms(input: SendSmsInput): Promise<PlatformResult<{ messageId: string }>> {
  const existing = await prisma.outboundMessage.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return platformOk({ messageId: existing.id });

  const message = await prisma.outboundMessage.create({
    data: {
      channel: "SMS",
      purpose: input.purpose,
      recipientUserId: input.recipientUserId,
      toAddress: input.to,
      idempotencyKey: input.idempotencyKey,
      relatedNotificationId: input.relatedNotificationId,
      status: "QUEUED",
    },
  });

  if (process.env.SMS_PROVIDER !== "stub" && !process.env.SMS_API_KEY) {
    await prisma.outboundMessage.update({
      where: { id: message.id },
      data: { status: "SKIPPED" },
    });
    return platformFail("DEPENDENCY_UNAVAILABLE", "SMS provider not configured");
  }

  try {
    const sent = await getSmsAdapter().send({
      to: input.to,
      body: input.body,
      purpose: input.purpose,
      idempotencyKey: input.idempotencyKey,
    });
    await prisma.outboundMessage.update({
      where: { id: message.id },
      data: { status: "SENT", sentAt: new Date(), providerMessageId: sent.id },
    });
    return platformOk({ messageId: message.id });
  } catch {
    try {
      const { enqueue } = await import("@/lib/platform/jobs");
      await enqueue({
        type: "OUTBOUND_SMS",
        idempotencyKey: input.idempotencyKey,
        payload: { messageId: message.id },
      });
    } catch {
      await prisma.outboundMessage.update({
        where: { id: message.id },
        data: { status: "FAILED" },
      });
      return platformFail("DEPENDENCY_UNAVAILABLE");
    }
    return platformOk({ messageId: message.id });
  }
}
