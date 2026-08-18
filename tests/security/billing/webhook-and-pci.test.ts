import { describe, expect, it } from "vitest";
import { stubPaymentsAdapter } from "@/adapters/stub-payments";
import { paymentLog } from "@/lib/platform/payment-log";

describe("webhook and PCI boundary", () => {
  it("rejects unsigned stub webhooks", () => {
    expect(stubPaymentsAdapter.verifyWebhookSignature("{}", "bad")).toBe(false);
    expect(stubPaymentsAdapter.verifyWebhookSignature("{}", "stub_sig_ok")).toBe(true);
  });

  it("does not log client secrets or PAN-like keys", () => {
    const lines: unknown[] = [];
    const original = console.info;
    console.info = (...args: unknown[]) => {
      lines.push(args);
    };
    try {
      paymentLog("intent_created", {
        obligationId: "ob-1",
        clientSecret: "stub_secret_should_not_log",
        pan: "4111111111111111",
        cvv: "123",
        signature: "sig",
      });
    } finally {
      console.info = original;
    }
    const serialized = JSON.stringify(lines);
    expect(serialized).not.toContain("stub_secret_should_not_log");
    expect(serialized).not.toContain("4111111111111111");
    expect(serialized).not.toContain("123");
    expect(serialized).toContain("ob-1");
  });
});
