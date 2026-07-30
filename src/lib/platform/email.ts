import type { LocaleCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEmailSender } from "@/auth/email";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  purpose: string;
  locale?: LocaleCode;
  idempotencyKey: string;
  recipientUserId?: string;
  relatedNotificationId?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<PlatformResult<{ messageId: string }>> {
  const existing = await prisma.outboundMessage.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) {
    return platformOk({ messageId: existing.id });
  }

  const to = input.to.toLowerCase();
  const sinceMinute = new Date(Date.now() - 60_000);
  const sinceHour = new Date(Date.now() - 60 * 60_000);
  const [recentMinute, recentHour] = await Promise.all([
    prisma.outboundMessage.count({
      where: {
        channel: "EMAIL",
        toAddress: to,
        purpose: input.purpose,
        createdAt: { gte: sinceMinute },
      },
    }),
    prisma.outboundMessage.count({
      where: {
        channel: "EMAIL",
        toAddress: to,
        purpose: input.purpose,
        createdAt: { gte: sinceHour },
      },
    }),
  ]);
  if (recentMinute >= 1 || recentHour >= 5) {
    return platformFail("RATE_LIMITED", "Too many emails. Please try again later.");
  }

  const message = await prisma.outboundMessage.create({
    data: {
      channel: "EMAIL",
      purpose: input.purpose,
      recipientUserId: input.recipientUserId,
      toAddress: to,
      locale: input.locale ?? "AR",
      templateKey: input.purpose,
      idempotencyKey: input.idempotencyKey,
      relatedNotificationId: input.relatedNotificationId,
      status: "QUEUED",
    },
  });

  try {
    await getEmailSender().send({
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    await prisma.outboundMessage.update({
      where: { id: message.id },
      data: { status: "SENT", sentAt: new Date() },
    });
    return platformOk({ messageId: message.id });
  } catch {
    try {
      const { enqueue } = await import("@/lib/platform/jobs");
      await enqueue({
        type: "OUTBOUND_EMAIL",
        idempotencyKey: input.idempotencyKey,
        payload: { messageId: message.id },
      });
    } catch {
      await prisma.outboundMessage.update({
        where: { id: message.id },
        data: { status: "FAILED" },
      });
      return platformFail("DEPENDENCY_UNAVAILABLE", "Email send failed");
    }
    return platformOk({ messageId: message.id });
  }
}
