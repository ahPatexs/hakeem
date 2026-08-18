import { describe, expect, it } from "vitest";
import { stubPaymentsAdapter } from "@/adapters/stub-payments";
import { RECONCILE_NO_CAPTURE_MS, STUCK_PROCESSING_MS } from "@/domain/billing/constants";
import { canTransition } from "@/domain/billing/state-machine";

describe("payment reconcile rules", () => {
  it("uses 15m stuck list window and 30m no-capture fail window", () => {
    expect(STUCK_PROCESSING_MS).toBe(15 * 60 * 1000);
    expect(RECONCILE_NO_CAPTURE_MS).toBe(30 * 60 * 1000);
  });

  it("corrects captured-but-Failed to Paid once", () => {
    expect(canTransition("FAILED", "PAID")).toBe(true);
    expect(canTransition("PAID", "PAID")).toBe(true);
  });

  it("marks uncaptured stub intents as not captured until webhook/paid", async () => {
    const intent = await stubPaymentsAdapter.createPaymentIntent({
      obligationId: "ob-rec",
      amountCents: 15000,
      currency: "SAR",
      idempotencyKey: "appt:ob-rec",
      patientUserId: "user-1",
    });
    const before = await stubPaymentsAdapter.retrievePayment({
      providerIntentId: intent.providerIntentId,
      obligationId: "ob-rec",
    });
    expect(before.captured).toBe(false);
    stubPaymentsAdapter.markCaptured(intent.providerIntentId);
    const after = await stubPaymentsAdapter.retrievePayment({
      providerIntentId: intent.providerIntentId,
      obligationId: "ob-rec",
    });
    expect(after.captured).toBe(true);
  });
});
