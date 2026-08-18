import { prisma } from "@/lib/prisma";
import { getEmailAdapter, getPushAdapter, getSmsAdapter } from "@/adapters";
import { notifyAdmins } from "@/lib/admin/notify-admins";
import type { BackgroundJobType } from "@/domain/platform/jobs";

function asRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  throw new Error("INVALID_JOB_PAYLOAD");
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`MISSING_JOB_FIELD:${key}`);
  }
  return value;
}

async function resolveOutboundFromMessageId(messageId: string) {
  const message = await prisma.outboundMessage.findUnique({ where: { id: messageId } });
  if (!message) throw new Error("OUTBOUND_MESSAGE_NOT_FOUND");
  const notification = message.relatedNotificationId
    ? await prisma.notification.findUnique({
        where: { id: message.relatedNotificationId },
        select: { title: true, body: true, href: true },
      })
    : null;
  return { message, notification };
}

export async function handleBackgroundJob(type: BackgroundJobType, payload: unknown): Promise<void> {
  const record = asRecord(payload);

  switch (type) {
    case "OUTBOUND_EMAIL": {
      if (typeof record.messageId === "string") {
        const { message, notification } = await resolveOutboundFromMessageId(record.messageId);
        if (!notification) throw new Error("MISSING_JOB_FIELD:relatedNotification");
        const sent = await getEmailAdapter().send({
          to: message.toAddress,
          subject: notification.title,
          text: notification.body,
          purpose: message.purpose,
          locale: message.locale === "EN" ? "en" : "ar",
          idempotencyKey: message.idempotencyKey,
        });
        await prisma.outboundMessage.update({
          where: { id: message.id },
          data: { status: "SENT", sentAt: new Date(), providerMessageId: sent.id },
        });
        return;
      }
      const sent = await getEmailAdapter().send({
        to: readString(record, "to"),
        subject: readString(record, "subject"),
        text: readString(record, "text"),
        html: typeof record.html === "string" ? record.html : undefined,
        purpose: readString(record, "purpose"),
        locale: record.locale === "en" || record.locale === "ar" ? record.locale : undefined,
        idempotencyKey: readString(record, "idempotencyKey"),
      });
      const existing = await prisma.outboundMessage.findUnique({
        where: { idempotencyKey: readString(record, "idempotencyKey") },
      });
      if (existing) {
        await prisma.outboundMessage.update({
          where: { id: existing.id },
          data: { status: "SENT", sentAt: new Date(), providerMessageId: sent.id },
        });
      }
      return;
    }
    case "OUTBOUND_SMS": {
      if (typeof record.messageId === "string") {
        const { message, notification } = await resolveOutboundFromMessageId(record.messageId);
        if (!notification) throw new Error("MISSING_JOB_FIELD:relatedNotification");
        const sent = await getSmsAdapter().send({
          to: message.toAddress,
          body: notification.body,
          purpose: message.purpose,
          idempotencyKey: message.idempotencyKey,
        });
        await prisma.outboundMessage.update({
          where: { id: message.id },
          data: { status: "SENT", sentAt: new Date(), providerMessageId: sent.id },
        });
        return;
      }
      const sent = await getSmsAdapter().send({
        to: readString(record, "to"),
        body: readString(record, "body"),
        purpose: readString(record, "purpose"),
        idempotencyKey: readString(record, "idempotencyKey"),
      });
      const existing = await prisma.outboundMessage.findUnique({
        where: { idempotencyKey: readString(record, "idempotencyKey") },
      });
      if (existing) {
        await prisma.outboundMessage.update({
          where: { id: existing.id },
          data: { status: "SENT", sentAt: new Date(), providerMessageId: sent.id },
        });
      }
      return;
    }
    case "OUTBOUND_PUSH": {
      if (typeof record.messageId === "string") {
        const { message, notification } = await resolveOutboundFromMessageId(record.messageId);
        if (!notification) throw new Error("MISSING_JOB_FIELD:relatedNotification");
        await getPushAdapter().send({
          userId: message.recipientUserId ?? message.toAddress,
          title: notification.title,
          body: notification.body,
          href: notification.href ?? undefined,
          idempotencyKey: message.idempotencyKey,
        });
        await prisma.outboundMessage.update({
          where: { id: message.id },
          data: { status: "SENT", sentAt: new Date() },
        });
        return;
      }
      await getPushAdapter().send({
        userId: readString(record, "userId"),
        title: readString(record, "title"),
        body: readString(record, "body"),
        href: typeof record.href === "string" ? record.href : undefined,
        idempotencyKey: readString(record, "idempotencyKey"),
      });
      const existing = await prisma.outboundMessage.findUnique({
        where: { idempotencyKey: readString(record, "idempotencyKey") },
      });
      if (existing) {
        await prisma.outboundMessage.update({
          where: { id: existing.id },
          data: { status: "SENT", sentAt: new Date() },
        });
      }
      return;
    }
    case "MALWARE_SCAN": {
      const { runMalwareScanJob } = await import("@/lib/platform/storage");
      await runMalwareScanJob({
        uploadId: typeof record.uploadId === "string" ? record.uploadId : undefined,
        documentId: typeof record.documentId === "string" ? record.documentId : undefined,
        fileName: typeof record.fileName === "string" ? record.fileName : undefined,
      });
      return;
    }
    case "SEARCH_REFRESH_DOCTOR": {
      const { refreshDoctorProjection } = await import("@/lib/platform/search");
      await refreshDoctorProjection(readString(record, "doctorId"));
      return;
    }
    case "WEBHOOK_SIDE_EFFECT": {
      console.info("[job:webhook-side-effect:stub]", {
        eventType: readString(record, "eventType"),
        provider: record.provider,
        obligationId: record.obligationId,
      });
      return;
    }
    case "NOTIFY_ADMINS_FANOUT": {
      const category = record.category;
      if (
        category !== "ADMIN_OPS" &&
        category !== "SECURITY" &&
        category !== "HEALTH" &&
        category !== "AI_GOVERNANCE" &&
        category !== "PAYMENT" &&
        category !== "SYSTEM"
      ) {
        throw new Error("MISSING_JOB_FIELD:category");
      }
      await notifyAdmins({
        category,
        title: readString(record, "title"),
        body: readString(record, "body"),
        href: typeof record.href === "string" ? record.href : undefined,
      });
      return;
    }
    case "VIDEO_RECORDING_FINALIZE": {
      const egressId = typeof record.egressId === "string" ? record.egressId : null;
      const sessionId = typeof record.sessionId === "string" ? record.sessionId : null;
      if (!egressId || !sessionId) throw new Error("MISSING_JOB_FIELD:egressId|sessionId");
      const adapter = (await import("@/adapters")).getTelemedicineAdapter();
      if (adapter.stopRecording) {
        await adapter.stopRecording({ egressId }).catch(() => undefined);
      }
      await prisma.videoCallEvent.create({
        data: {
          sessionId,
          kind: "RECORDING_STOP",
          metadata: { egressId },
        },
      });
      return;
    }
    case "PAYMENT_RECONCILE": {
      const { reconcileObligation } = await import("@/lib/platform/payments");
      await reconcileObligation({ obligationId: readString(record, "obligationId") });
      return;
    }
    case "PAYMENT_RECEIPT_SIDE_EFFECT": {
      return;
    }
    default: {
      const _exhaustive: never = type;
      throw new Error(`UNSUPPORTED_JOB_TYPE:${String(_exhaustive)}`);
    }
  }
}
