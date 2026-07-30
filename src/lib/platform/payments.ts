import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getPaymentsAdapter } from "@/adapters";
import { assertCanPay } from "@/domain/patient/payments";
import {
  buildWebhookReceipt,
  PAYMENTS_WEBHOOK_PROVIDER,
  resolveWebhookTransition,
} from "@/domain/platform/webhooks";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { notify } from "@/lib/platform/notifications";

function resolvePaymentsAdapter() {
  return getPaymentsAdapter();
}

export async function createPaymentIntent(input: {
  obligationId: string;
  idempotencyKey?: string;
  patientUserId: string;
}): Promise<
  PlatformResult<{
    providerIntentId: string;
    clientSecret?: string;
    redirectUrl?: string;
    idempotencyKey: string;
  }>
> {
  const obligation = await prisma.paymentObligation.findFirst({
    where: { id: input.obligationId, patientUserId: input.patientUserId },
  });
  if (!obligation) return platformFail("NOT_FOUND");
  try {
    assertCanPay(obligation, input.patientUserId);
  } catch {
    return platformFail("CONFLICT", "Payment obligation cannot be paid");
  }

  const idempotencyKey = input.idempotencyKey ?? randomUUID();
  const adapter = resolvePaymentsAdapter();
  const intent = await adapter.createPaymentIntent({
    obligationId: obligation.id,
    amountCents: obligation.amountCents,
    currency: obligation.currency,
    idempotencyKey,
    description: obligation.description,
    patientUserId: input.patientUserId,
  });

  await prisma.paymentAttempt.create({
    data: {
      obligationId: obligation.id,
      providerIntentId: intent.providerIntentId,
      status: "PENDING",
    },
  });

  return platformOk({
    providerIntentId: intent.providerIntentId,
    clientSecret: intent.clientSecret,
    redirectUrl: intent.redirectUrl,
    idempotencyKey,
  });
}

export async function applyPaymentWebhook(input: {
  rawBody: string;
  signature: string;
}): Promise<PlatformResult<{ eventId: string; applied: boolean }>> {
  const adapter = resolvePaymentsAdapter();
  const signatureValid = adapter.verifyWebhookSignature(input.rawBody, input.signature);
  if (!signatureValid) return platformFail("VALIDATION_ERROR", "Invalid webhook signature");

  let event;
  try {
    event = adapter.parseWebhookEvent(input.rawBody);
  } catch {
    return platformFail("VALIDATION_ERROR", "Malformed webhook payload");
  }

  const receiptData = buildWebhookReceipt({
    provider: PAYMENTS_WEBHOOK_PROVIDER,
    event,
    signatureValid,
    rawBody: input.rawBody,
    obligationId: event.obligationId,
  });

  const existingReceipt = await prisma.webhookReceipt.findUnique({
    where: {
      provider_providerEventId: {
        provider: PAYMENTS_WEBHOOK_PROVIDER,
        providerEventId: event.eventId,
      },
    },
  });
  if (existingReceipt?.processedAt) {
    return platformOk({ eventId: event.eventId, applied: false });
  }

  const obligation = await prisma.paymentObligation.findUnique({
    where: { id: event.obligationId },
  });
  if (!obligation) {
    if (!existingReceipt) {
      await prisma.webhookReceipt.create({
        data: { ...receiptData, processedAt: new Date() },
      });
    }
    return platformOk({ eventId: event.eventId, applied: false });
  }

  const newStatus = resolveWebhookTransition(obligation.status, event.status);
  if (!newStatus) {
    if (!existingReceipt) {
      await prisma.webhookReceipt.create({
        data: { ...receiptData, obligationId: obligation.id, processedAt: new Date() },
      });
    }
    return platformOk({ eventId: event.eventId, applied: false });
  }

  if (!existingReceipt) {
    await prisma.webhookReceipt.create({
      data: { ...receiptData, obligationId: obligation.id },
    });
  }

  if (newStatus === "PAID") {
    await prisma.$transaction([
      prisma.paymentObligation.update({
        where: { id: obligation.id },
        data: { status: "PAID", providerRef: event.providerIntentId },
      }),
      prisma.paymentAttempt.updateMany({
        where: { obligationId: obligation.id, providerIntentId: event.providerIntentId },
        data: { status: "PAID", rawEventId: event.eventId },
      }),
      prisma.webhookReceipt.updateMany({
        where: {
          provider: PAYMENTS_WEBHOOK_PROVIDER,
          providerEventId: event.eventId,
        },
        data: { processedAt: new Date() },
      }),
    ]);

    await notify({
      recipientUserId: obligation.patientUserId,
      eventType: "payment.received",
      category: "PAYMENT",
      title: "Payment received",
      body: `Payment of ${(obligation.amountCents / 100).toFixed(2)} ${obligation.currency} was successful.`,
      href: `/patient/payments/${obligation.id}`,
    });
  } else {
    await prisma.$transaction([
      prisma.paymentObligation.update({
        where: { id: obligation.id },
        data: { status: "FAILED" },
      }),
      prisma.webhookReceipt.updateMany({
        where: {
          provider: PAYMENTS_WEBHOOK_PROVIDER,
          providerEventId: event.eventId,
        },
        data: { processedAt: new Date() },
      }),
    ]);
  }

  return platformOk({ eventId: event.eventId, applied: true });
}
