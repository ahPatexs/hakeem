import { prisma } from "@/lib/prisma";
import { getPaymentsAdapter } from "@/adapters";
import { assertCanPay, assertFailedRetryAllowed } from "@/domain/billing/eligibility";
import { PaymentDomainError } from "@/domain/billing/errors";
import { applyCancelledTransition } from "@/domain/billing/state-machine";
import { allocateInvoiceNumber } from "@/domain/billing/invoices";
import {
  FAILED_RETRY_MAX,
  FAILED_RETRY_WINDOW_MS,
  RECONCILE_NO_CAPTURE_MS,
  STUCK_PROCESSING_MS,
  paymentReconcileIdempotencyKey,
} from "@/domain/billing/constants";
import {
  buildWebhookReceipt,
  evaluateWebhookFreshness,
  PAYMENTS_WEBHOOK_PROVIDER,
  resolveWebhookTransition,
} from "@/domain/platform/webhooks";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { notify } from "@/lib/platform/notifications";
import { adminAudit, ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";
import { paymentLog } from "@/lib/platform/payment-log";
import type { PaymentStatus } from "@prisma/client";
import { enqueueJob } from "@/domain/platform/jobs";

function resolvePaymentsAdapter() {
  return getPaymentsAdapter();
}

async function assignInvoiceIfNeeded(obligationId: string, currentInvoice: string | null): Promise<string | null> {
  if (currentInvoice) return currentInvoice;
  const invoiceNumber = await allocateInvoiceNumber();
  await prisma.paymentObligation.update({
    where: { id: obligationId },
    data: { invoiceNumber, invoicedAt: new Date() },
  });
  return invoiceNumber;
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
    status: "PROCESSING";
  }>
> {
  const obligation = await prisma.paymentObligation.findFirst({
    where: { id: input.obligationId, patientUserId: input.patientUserId },
  });
  if (!obligation) return platformFail("NOT_FOUND");

  if (obligation.status === "PROCESSING" && obligation.providerRef) {
    return platformOk({
      providerIntentId: obligation.providerRef,
      clientSecret: undefined,
      redirectUrl: undefined,
      idempotencyKey: obligation.idempotencyKey,
      status: "PROCESSING",
    });
  }

  const failedInWindow = await prisma.paymentAttempt.count({
    where: {
      obligationId: obligation.id,
      status: "FAILED",
      createdAt: { gte: new Date(Date.now() - FAILED_RETRY_WINDOW_MS) },
    },
  });
  try {
    assertFailedRetryAllowed(failedInWindow);
    assertCanPay(obligation, input.patientUserId);
  } catch (error) {
    if (error instanceof PaymentDomainError && error.message === "RATE_LIMITED") {
      return platformFail("RATE_LIMITED", `Too many failed attempts (max ${FAILED_RETRY_MAX} per hour)`);
    }
    if (error instanceof PaymentDomainError && error.code === "PAYMENT_CONFLICT") {
      return platformFail("CONFLICT", error.message);
    }
    return platformFail("CONFLICT", error instanceof Error ? error.message : "Cannot pay");
  }

  const idempotencyKey = obligation.idempotencyKey;
  const adapter = resolvePaymentsAdapter();
  const intent = await adapter.createPaymentIntent({
    obligationId: obligation.id,
    amountCents: obligation.amountCents,
    currency: obligation.currency,
    idempotencyKey,
    description: obligation.description,
    patientUserId: input.patientUserId,
  });

  await prisma.$transaction([
    prisma.paymentObligation.update({
      where: { id: obligation.id },
      data: {
        status: "PROCESSING",
        processingStartedAt: new Date(),
        providerRef: intent.providerIntentId,
      },
    }),
    prisma.paymentAttempt.create({
      data: {
        obligationId: obligation.id,
        providerIntentId: intent.providerIntentId,
        status: "PROCESSING",
      },
    }),
  ]);

  await adminAudit({
    type: ADMIN_AUDIT_TYPES.billingPaySubmit,
    outcome: "SUCCESS",
    actorUserId: input.patientUserId,
    targetUserId: input.patientUserId,
    meta: { obligationId: obligation.id, providerIntentId: intent.providerIntentId },
  });
  paymentLog("intent_created", { obligationId: obligation.id, providerIntentId: intent.providerIntentId });

  return platformOk({
    providerIntentId: intent.providerIntentId,
    clientSecret: intent.clientSecret,
    redirectUrl: intent.redirectUrl,
    idempotencyKey,
    status: "PROCESSING",
  });
}

async function markCaptured(input: {
  obligationId: string;
  providerIntentId: string;
  eventId?: string;
  actorUserId?: string;
  notifyPatient?: boolean;
}): Promise<void> {
  const obligation = await prisma.paymentObligation.findUnique({ where: { id: input.obligationId } });
  if (!obligation) return;
  if (obligation.status === "PAID") return;

  await prisma.$transaction([
    prisma.paymentObligation.update({
      where: { id: obligation.id },
      data: { status: "PAID", providerRef: input.providerIntentId },
    }),
    prisma.paymentAttempt.updateMany({
      where: { obligationId: obligation.id, providerIntentId: input.providerIntentId },
      data: { status: "PAID", rawEventId: input.eventId ?? null },
    }),
  ]);
  await assignInvoiceIfNeeded(obligation.id, obligation.invoiceNumber);
  await adminAudit({
    type: ADMIN_AUDIT_TYPES.billingPaid,
    outcome: "SUCCESS",
    actorUserId: input.actorUserId ?? obligation.patientUserId,
    targetUserId: obligation.patientUserId,
    meta: { obligationId: obligation.id, providerIntentId: input.providerIntentId },
  });
  if (input.notifyPatient !== false) {
    await notify({
      recipientUserId: obligation.patientUserId,
      eventType: "payment.received",
      category: "PAYMENT",
      title: "Payment received",
      body: `Payment of ${(obligation.amountCents / 100).toFixed(2)} ${obligation.currency} was successful.`,
      href: `/patient/payments/${obligation.id}`,
    });
  }
}

export async function confirmStubPayment(input: {
  obligationId: string;
  patientUserId: string;
}): Promise<PlatformResult<{ invoiceNumber: string | null }>> {
  if ((process.env.PAYMENT_PROVIDER ?? "stub").toLowerCase() !== "stub") {
    return platformFail("FORBIDDEN", "Stub confirmation is not available");
  }
  const obligation = await prisma.paymentObligation.findFirst({
    where: { id: input.obligationId, patientUserId: input.patientUserId },
  });
  if (!obligation) return platformFail("NOT_FOUND");
  if (obligation.status === "PAID") {
    return platformOk({ invoiceNumber: obligation.invoiceNumber });
  }
  if (obligation.status !== "PROCESSING" && obligation.status !== "PENDING" && obligation.status !== "FAILED") {
    return platformFail("CONFLICT", "Cannot confirm payment in current status");
  }
  const providerIntentId = obligation.providerRef ?? `stub_pi_${obligation.id}`;
  await markCaptured({
    obligationId: obligation.id,
    providerIntentId,
    actorUserId: input.patientUserId,
  });
  const updated = await prisma.paymentObligation.findUnique({ where: { id: obligation.id } });
  return platformOk({ invoiceNumber: updated?.invoiceNumber ?? null });
}

export async function applyPaymentWebhook(input: {
  rawBody: string;
  signature: string;
  timestamp?: string | null;
}): Promise<PlatformResult<{ eventId: string; applied: boolean }>> {
  const adapter = resolvePaymentsAdapter();
  const signatureValid = adapter.verifyWebhookSignature(input.rawBody, input.signature);
  if (!signatureValid) return platformFail("VALIDATION_ERROR", "Invalid webhook signature");

  const { freshnessValid, stale } = evaluateWebhookFreshness(input.timestamp);
  if (stale) {
    return platformFail("VALIDATION_ERROR", "Stale webhook timestamp");
  }

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
    freshnessValid,
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

  if (event.status === "refunded") {
    if (!existingReceipt) {
      await prisma.webhookReceipt.create({
        data: { ...receiptData, obligationId: obligation.id, processedAt: new Date() },
      });
    } else {
      await prisma.webhookReceipt.update({
        where: { id: existingReceipt.id },
        data: { processedAt: new Date() },
      });
    }
    paymentLog("webhook_refunded_notice", { obligationId: obligation.id, eventId: event.eventId });
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
    await markCaptured({
      obligationId: obligation.id,
      providerIntentId: event.providerIntentId,
      eventId: event.eventId,
    });
  } else if (newStatus === "FAILED") {
    await prisma.$transaction([
      prisma.paymentObligation.update({
        where: { id: obligation.id },
        data: { status: "FAILED" },
      }),
      prisma.paymentAttempt.updateMany({
        where: { obligationId: obligation.id, providerIntentId: event.providerIntentId },
        data: { status: "FAILED", rawEventId: event.eventId },
      }),
    ]);
    await adminAudit({
      type: ADMIN_AUDIT_TYPES.billingFailed,
      outcome: "SUCCESS",
      targetUserId: obligation.patientUserId,
      meta: { obligationId: obligation.id, eventId: event.eventId },
    });
  } else if (newStatus === "PROCESSING") {
    await prisma.paymentObligation.update({
      where: { id: obligation.id },
      data: { status: "PROCESSING", processingStartedAt: obligation.processingStartedAt ?? new Date() },
    });
  }

  await prisma.webhookReceipt.updateMany({
    where: {
      provider: PAYMENTS_WEBHOOK_PROVIDER,
      providerEventId: event.eventId,
    },
    data: { processedAt: new Date() },
  });

  paymentLog("webhook_applied", { obligationId: obligation.id, eventId: event.eventId, status: newStatus });
  return platformOk({ eventId: event.eventId, applied: true });
}

export async function reconcileObligation(input: {
  obligationId: string;
  actorUserId?: string;
}): Promise<PlatformResult<{ status: PaymentStatus }>> {
  const obligation = await prisma.paymentObligation.findUnique({ where: { id: input.obligationId } });
  if (!obligation) return platformFail("NOT_FOUND");

  const adapter = resolvePaymentsAdapter();
  const providerIntentId = obligation.providerRef;
  if (!providerIntentId) {
    const age = Date.now() - obligation.createdAt.getTime();
    if (obligation.status === "PROCESSING" && age > RECONCILE_NO_CAPTURE_MS) {
      await prisma.paymentObligation.update({
        where: { id: obligation.id },
        data: { status: "FAILED", lastReconciledAt: new Date() },
      });
      return platformOk({ status: "FAILED" });
    }
    await prisma.paymentObligation.update({
      where: { id: obligation.id },
      data: { lastReconciledAt: new Date() },
    });
    return platformOk({ status: obligation.status });
  }

  const retrieved = await adapter.retrievePayment({
    providerIntentId,
    obligationId: obligation.id,
  });

  await prisma.paymentObligation.update({
    where: { id: obligation.id },
    data: { lastReconciledAt: new Date() },
  });

  if (retrieved.captured && obligation.status !== "PAID") {
    const previous = obligation.status;
    await markCaptured({
      obligationId: obligation.id,
      providerIntentId,
      actorUserId: input.actorUserId,
    });
    if (previous === "FAILED") {
      await adminAudit({
        type: ADMIN_AUDIT_TYPES.billingReconcileCorrection,
        outcome: "SUCCESS",
        actorUserId: input.actorUserId,
        targetUserId: obligation.patientUserId,
        meta: { obligationId: obligation.id, from: previous, to: "PAID" },
      });
    }
    return platformOk({ status: "PAID" });
  }

  const started = obligation.processingStartedAt ?? obligation.updatedAt;
  if (
    !retrieved.captured &&
    (obligation.status === "PROCESSING" || obligation.status === "PENDING") &&
    Date.now() - started.getTime() > RECONCILE_NO_CAPTURE_MS
  ) {
    await prisma.paymentObligation.update({
      where: { id: obligation.id },
      data: { status: "FAILED" },
    });
    return platformOk({ status: "FAILED" });
  }

  return platformOk({ status: obligation.status });
}

export async function enqueueStuckPaymentReconciles(now = new Date()): Promise<{ enqueued: number }> {
  const cutoff = new Date(now.getTime() - STUCK_PROCESSING_MS);
  const stuck = await prisma.paymentObligation.findMany({
    where: {
      status: "PROCESSING",
      processingStartedAt: { lte: cutoff },
    },
    select: { id: true },
    take: 200,
  });

  let enqueued = 0;
  for (const row of stuck) {
    const result = await enqueueJob({
      type: "PAYMENT_RECONCILE",
      idempotencyKey: paymentReconcileIdempotencyKey(row.id, now),
      payload: { obligationId: row.id },
    });
    if (result.ok) enqueued += 1;
  }
  return { enqueued };
}

export async function cancelUnpaidObligationForAppointment(appointmentId: string): Promise<void> {
  const obligation = await prisma.paymentObligation.findUnique({ where: { appointmentId } });
  if (!obligation) return;
  try {
    applyCancelledTransition(obligation.status);
  } catch {
    return;
  }
  await prisma.paymentObligation.update({
    where: { id: obligation.id },
    data: { status: "CANCELLED" },
  });
  await adminAudit({
    type: ADMIN_AUDIT_TYPES.billingCancelled,
    outcome: "SUCCESS",
    targetUserId: obligation.patientUserId,
    meta: { obligationId: obligation.id, appointmentId },
  });
}

export async function ensurePayableObligation(input: {
  appointmentId: string;
  patientUserId: string;
  amountCents: number;
  description: string;
}): Promise<void> {
  if (input.amountCents <= 0) return;
  const existing = await prisma.paymentObligation.findUnique({
    where: { appointmentId: input.appointmentId },
  });
  if (existing) return;
  await prisma.paymentObligation.create({
    data: {
      patientUserId: input.patientUserId,
      appointmentId: input.appointmentId,
      description: input.description,
      amountCents: input.amountCents,
      currency: "SAR",
      status: "PENDING",
      idempotencyKey: `appt:${input.appointmentId}`,
    },
  });
}
