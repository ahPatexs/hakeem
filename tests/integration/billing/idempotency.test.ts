import { describe, expect, it } from "vitest";
import { stubPaymentsAdapter } from "@/adapters/stub-payments";
import { resolveWebhookTransition } from "@/domain/platform/webhooks";

describe("payment idempotency", () => {
  it("reuses the same stub intent id for the same obligation", async () => {
    const a = await stubPaymentsAdapter.createPaymentIntent({
      obligationId: "ob-dup",
      amountCents: 15000,
      currency: "SAR",
      idempotencyKey: "appt:ob-dup",
      patientUserId: "user-1",
    });
    const b = await stubPaymentsAdapter.createPaymentIntent({
      obligationId: "ob-dup",
      amountCents: 15000,
      currency: "SAR",
      idempotencyKey: "appt:ob-dup",
      patientUserId: "user-1",
    });
    expect(a.providerIntentId).toBe(b.providerIntentId);
  });

  it("paid webhook replay is a no-op", () => {
    expect(resolveWebhookTransition("PAID", "paid")).toBeNull();
    expect(resolveWebhookTransition("PAID", "failed")).toBeNull();
  });
});
