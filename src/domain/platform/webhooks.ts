import { createHash } from "node:crypto";
import type { PaymentWebhookEvent } from "@/ports/payments";
import { applyFailedTransition, applyPaidTransition } from "@/domain/platform/billing";

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

/**
 * When a timestamp claim is present, require it within skew of now.
 * When absent, freshness is treated as unknown (null) — signature still required.
 */
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
  freshnessValid?: boolean | null;
}) {
  return {
    provider: input.provider,
    providerEventId: input.event.eventId,
    eventType: input.event.status === "paid" ? "payment.paid" : "payment.failed",
    signatureValid: input.signatureValid,
    freshnessValid: input.freshnessValid ?? null,
    obligationId: input.obligationId,
    rawHash: hashWebhookBody(input.rawBody),
  };
}
