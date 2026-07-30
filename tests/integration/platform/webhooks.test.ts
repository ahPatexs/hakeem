import { describe, expect, it } from "vitest";
import { canTransition } from "@/domain/platform/billing";
import { resolveWebhookTransition } from "@/domain/platform/webhooks";

describe("payment webhook contract", () => {
  it("idempotent replay on already-paid obligation", () => {
    expect(resolveWebhookTransition("PAID", "paid")).toBeNull();
  });

  it("never allows backward billing transitions", () => {
    expect(canTransition("PAID", "PENDING")).toBe(false);
    expect(canTransition("REFUNDED", "PAID")).toBe(false);
    expect(resolveWebhookTransition("REFUNDED", "paid")).toBeNull();
  });

  it("accepts first-time paid transition from pending", () => {
    expect(resolveWebhookTransition("PENDING", "paid")).toBe("PAID");
    expect(resolveWebhookTransition("PENDING", "failed")).toBe("FAILED");
  });
});
