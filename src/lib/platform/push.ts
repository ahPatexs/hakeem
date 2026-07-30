import { prisma } from "@/lib/prisma";
import { getPushAdapter } from "@/adapters";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { isPlatformPushEnabled } from "@/lib/platform/flags";

export type SendPushInput = {
  userId: string;
  title: string;
  body: string;
  href?: string;
  idempotencyKey: string;
  relatedNotificationId?: string;
};

export async function sendPush(input: SendPushInput): Promise<PlatformResult<void>> {
  if (!(await isPlatformPushEnabled())) {
    return platformFail("DEPENDENCY_UNAVAILABLE", "Push notifications disabled");
  }

  const existing = await prisma.outboundMessage.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return platformOk(undefined);

  const devices = await prisma.pushDeviceRegistration.findMany({
    where: { userId: input.userId, revokedAt: null },
    take: 10,
  });
  if (!devices.length) {
    await prisma.outboundMessage.create({
      data: {
        channel: "PUSH",
        purpose: "push.notification",
        recipientUserId: input.userId,
        toAddress: input.userId,
        idempotencyKey: input.idempotencyKey,
        relatedNotificationId: input.relatedNotificationId,
        status: "SKIPPED",
      },
    });
    return platformOk(undefined);
  }

  const message = await prisma.outboundMessage.create({
    data: {
      channel: "PUSH",
      purpose: "push.notification",
      recipientUserId: input.userId,
      toAddress: input.userId,
      idempotencyKey: input.idempotencyKey,
      relatedNotificationId: input.relatedNotificationId,
      status: "QUEUED",
    },
  });

  try {
    await getPushAdapter().send({
      userId: input.userId,
      title: input.title,
      body: input.body,
      href: input.href,
      idempotencyKey: input.idempotencyKey,
    });
    await prisma.outboundMessage.update({
      where: { id: message.id },
      data: { status: "SENT", sentAt: new Date() },
    });
    return platformOk(undefined);
  } catch {
    try {
      const { enqueue } = await import("@/lib/platform/jobs");
      await enqueue({
        type: "OUTBOUND_PUSH",
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
    return platformOk(undefined);
  }
}
