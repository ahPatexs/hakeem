import type { LocaleCode, NotificationCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveEffectiveChannels } from "@/domain/platform/notifications";
import {
  platformFail,
  platformOk,
  platformPartial,
  type PlatformCode,
  type PlatformResult,
} from "@/domain/platform/outcomes";
import { outboundIdempotencyKey } from "@/lib/platform/idempotency";

export type NotifyInput = {
  recipientUserId: string;
  eventType: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href?: string;
  locale?: "en" | "ar";
  data?: Record<string, string>;
};

async function tryEnqueue(
  type: string,
  idempotencyKey: string,
  payload: object,
): Promise<PlatformCode> {
  try {
    const { enqueue } = await import("@/lib/platform/jobs");
    const result = await enqueue({ type, idempotencyKey, payload });
    return result.ok ? "OK" : result.code;
  } catch {
    return "DEPENDENCY_UNAVAILABLE";
  }
}

function toLocaleCode(locale?: "en" | "ar"): LocaleCode {
  return locale === "en" ? "EN" : "AR";
}

export async function notify(input: NotifyInput): Promise<PlatformResult<{ notificationId: string }>> {
  const channelStatuses: Record<string, PlatformCode> = {};

  const user = await prisma.user.findUnique({
    where: { id: input.recipientUserId },
    select: {
      email: true,
      portalSettings: {
        select: {
          locale: true,
          notifyAppointmentEmail: true,
          notifyClinicalEmail: true,
          notifyPrescriptionEmail: true,
          notifyPaymentEmail: true,
          notifySystemEmail: true,
        },
      },
    },
  });
  if (!user) return platformFail("NOT_FOUND", "Recipient not found");

  const prefs = user.portalSettings;
  const channels = resolveEffectiveChannels(input.eventType, prefs ?? {});
  const locale = input.locale ?? (prefs?.locale === "EN" ? "en" : "ar");
  const localeCode = toLocaleCode(locale);

  const notification = await prisma.notification.create({
    data: {
      recipientUserId: input.recipientUserId,
      category: input.category,
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });

  const eventId = notification.id;

  if (channels.email && user.email) {
    const idempotencyKey = outboundIdempotencyKey({
      purpose: input.eventType,
      recipient: user.email,
      eventId,
    });
    channelStatuses.email = await tryEnqueue("OUTBOUND_EMAIL", idempotencyKey, {
      to: user.email,
      subject: input.title,
      text: input.body,
      purpose: input.eventType,
      locale: localeCode,
      idempotencyKey,
      relatedNotificationId: notification.id,
      href: input.href,
    });
  }

  if (channels.sms) {
    const phone = input.data?.phone;
    if (phone) {
      const idempotencyKey = outboundIdempotencyKey({
        purpose: input.eventType,
        recipient: phone,
        eventId,
      });
      channelStatuses.sms = await tryEnqueue("OUTBOUND_SMS", idempotencyKey, {
        to: phone,
        body: input.body,
        purpose: input.eventType,
        idempotencyKey,
        relatedNotificationId: notification.id,
      });
    }
  }

  if (channels.push && (await (await import("@/lib/platform/flags")).isPlatformPushEnabled())) {
    const idempotencyKey = outboundIdempotencyKey({
      purpose: input.eventType,
      recipient: input.recipientUserId,
      eventId,
    });
    channelStatuses.push = await tryEnqueue("OUTBOUND_PUSH", idempotencyKey, {
      userId: input.recipientUserId,
      title: input.title,
      body: input.body,
      href: input.href,
      idempotencyKey,
      relatedNotificationId: notification.id,
    });
  }

  const hasPartial =
    Object.values(channelStatuses).length > 0 &&
    Object.values(channelStatuses).some((s) => s !== "OK");

  if (hasPartial) {
    return platformPartial({ notificationId: notification.id }, channelStatuses);
  }
  return platformOk({ notificationId: notification.id }, { channelStatuses });
}

export async function markNotificationRead(input: {
  id: string;
  userId: string;
}): Promise<PlatformResult<void>> {
  const result = await prisma.notification.updateMany({
    where: { id: input.id, recipientUserId: input.userId },
    data: { readAt: new Date() },
  });
  if (result.count === 0) return platformFail("NOT_FOUND");
  return platformOk(undefined);
}

export async function markAllNotificationsRead(input: {
  userId: string;
}): Promise<PlatformResult<{ count: number }>> {
  const result = await prisma.notification.updateMany({
    where: { recipientUserId: input.userId, readAt: null },
    data: { readAt: new Date() },
  });
  return platformOk({ count: result.count });
}
