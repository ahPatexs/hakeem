import { describe, expect, it } from "vitest";
import { stubPaymentsAdapter } from "@/adapters/stub-payments";
import { evaluateWebhookFreshness, resolveWebhookTransition } from "@/domain/platform/webhooks";

describe("payments webhook contract", () => {
  it("invalid signature is rejected by the stub adapter", () => {
    expect(stubPaymentsAdapter.verifyWebhookSignature("{}", "")).toBe(false);
  });

  it("stale timestamps are rejected", () => {
    const stale = String(Math.floor((Date.now() - 10 * 60 * 1000) / 1000));
    expect(evaluateWebhookFreshness(stale).stale).toBe(true);
  });

  it("paid event applies once then no-ops", () => {
    expect(resolveWebhookTransition("PROCESSING", "paid")).toBe("PAID");
    expect(resolveWebhookTransition("PAID", "paid")).toBeNull();
  });
});
