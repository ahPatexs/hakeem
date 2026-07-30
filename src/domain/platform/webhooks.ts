import { createHash } from "node:crypto";
import type { PaymentWebhookEvent } from "@/ports/payments";
import { applyFailedTransition, applyPaidTransition } from "@/domain/platform/billing";

export const PAYMENTS_WEBHOOK_PROVIDER = process.env.PAYMENT_PROVIDER ?? "stub";

export function hashWebhookBody(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

export type WebhookApplyInput = {
  provider: string;
  event: PaymentWebhookEvent;
  signatureValid: boolean;
  rawBody: string;
  obligationStatus: string;
};

export type WebhookApplyResult =
  | { applied: true; newStatus: "PAID" | "FAILED"; obligationId: string }
  | { applied: false; reason: "ALREADY_PROCESSED" | "OBLIGATION_NOT_FOUND" | "INVALID_SIGNATURE" | "NO_OP" };

export function resolveWebhookTransition(
  obligationStatus: string,
  eventStatus: "paid" | "failed",
): "PAID" | "FAILED" | null {
  if (eventStatus === "paid") {
    if (obligationStatus === "PAID") return null;
    try {
      applyPaidTransition(obligationStatus as "PENDING");
      return "PAID";
    } catch {
      return null;
    }
  }
  if (obligationStatus === "FAILED") return null;
  try {
    applyFailedTransition(obligationStatus as "PENDING");
    return "FAILED";
  } catch {
    return null;
  }
}

export function buildWebhookReceipt(input: {
  provider: string;
  event: PaymentWebhookEvent;
  signatureValid: boolean;
  rawBody: string;
  obligationId?: string;
}) {
  return {
    provider: input.provider,
    providerEventId: input.event.eventId,
    eventType: input.event.status === "paid" ? "payment.paid" : "payment.failed",
    signatureValid: input.signatureValid,
    obligationId: input.obligationId,
    rawHash: hashWebhookBody(input.rawBody),
  };
}
