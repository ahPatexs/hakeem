import { describe, expect, it } from "vitest";
import {
  buildWebhookReceipt,
  hashWebhookBody,
  resolveWebhookTransition,
} from "@/domain/platform/webhooks";

describe("payment webhook transitions", () => {
  it("allows PENDING → PAID", () => {
    expect(resolveWebhookTransition("PENDING", "paid")).toBe("PAID");
  });

  it("no-ops when already PAID", () => {
    expect(resolveWebhookTransition("PAID", "paid")).toBeNull();
  });

  it("rejects illegal backward PAID → FAILED", () => {
    expect(resolveWebhookTransition("PAID", "failed")).toBeNull();
    expect(resolveWebhookTransition("REFUNDED", "paid")).toBeNull();
  });

  it("builds deterministic receipt hash", () => {
    const body = '{"eventId":"e1","status":"paid"}';
    const receipt = buildWebhookReceipt({
      provider: "stub",
      event: {
        eventId: "e1",
        obligationId: "ob-1",
        providerIntentId: "pi-1",
        status: "paid",
      },
      signatureValid: true,
      rawBody: body,
      obligationId: "ob-1",
    });
    expect(receipt.rawHash).toBe(hashWebhookBody(body));
    expect(receipt.eventType).toBe("payment.paid");
  });
});
