import { createHash } from "node:crypto";
import type { PaymentStatus } from "@prisma/client";
import type { PaymentWebhookEvent } from "@/ports/payments";
import {
  applyFailedTransition,
  applyPaidTransition,
  applyProcessingTransition,
  canTransition,
} from "@/domain/platform/billing";

export const PAYMENTS_WEBHOOK_PROVIDER = process.env.PAYMENT_PROVIDER ?? "stub";

/** Default acceptance window for signed webhook timestamps (FR-045). */
export const WEBHOOK_FRESHNESS_SKEW_MS = 5 * 60 * 1000;

export function hashWebhookBody(rawBody: string): string {
  return createHash("sha256").update(rawBody).digest("hex");
}

export function parseWebhookTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && asNumber > 0) {
    return asNumber < 1e12 ? asNumber * 1000 : asNumber;
  }
  const asDate = Date.parse(value);
  return Number.isNaN(asDate) ? null : asDate;
}

export function evaluateWebhookFreshness(
  timestampHeader: string | null | undefined,
  nowMs = Date.now(),
  skewMs = WEBHOOK_FRESHNESS_SKEW_MS,
): { freshnessValid: boolean | null; stale: boolean } {
  const ts = parseWebhookTimestampMs(timestampHeader);
  if (ts == null) return { freshnessValid: null, stale: false };
  const stale = Math.abs(nowMs - ts) > skewMs;
  return { freshnessValid: !stale, stale };
}

export function resolveWebhookTransition(
  obligationStatus: string,
  eventStatus: "processing" | "paid" | "failed" | "refunded",
): PaymentStatus | null {
  const from = obligationStatus as PaymentStatus;
  if (eventStatus === "processing") {
    try {
      return applyProcessingTransition(from);
    } catch {
      return from === "PROCESSING" ? null : null;
    }
  }
  if (eventStatus === "paid") {
    if (from === "PAID") return null;
    try {
      return applyPaidTransition(from);
    } catch {
      return null;
    }
  }
  if (eventStatus === "failed") {
    if (from === "FAILED") return null;
    try {
      return applyFailedTransition(from);
    } catch {
      return null;
    }
  }
  return null;
}

export function webhookEventType(status: PaymentWebhookEvent["status"]): string {
  switch (status) {
    case "paid":
      return "payment.paid";
    case "failed":
      return "payment.failed";
    case "processing":
      return "payment.processing";
    case "refunded":
      return "payment.refunded";
    default:
      return "payment.unknown";
  }
}

export function buildWebhookReceipt(input: {
  provider: string;
  event: PaymentWebhookEvent;
  signatureValid: boolean;
  rawBody: string;
  obligationId?: string;
  freshnessValid?: boolean | null;
}) {
  return {
    provider: input.provider,
    providerEventId: input.event.eventId,
    eventType: webhookEventType(input.event.status),
    signatureValid: input.signatureValid,
    freshnessValid: input.freshnessValid ?? null,
    obligationId: input.obligationId,
    rawHash: hashWebhookBody(input.rawBody),
  };
}

export { canTransition };
