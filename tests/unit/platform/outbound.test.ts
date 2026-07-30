import { describe, expect, it } from "vitest";
import {
  hashIdempotencyKey,
  jobIdempotencyKey,
  outboundIdempotencyKey,
} from "@/lib/platform/idempotency";

describe("outbound idempotency keys", () => {
  it("builds stable outbound keys per event/channel/recipient", () => {
    const a = outboundIdempotencyKey({
      purpose: "appointment.confirmed",
      recipient: "user@example.com",
      eventId: "evt-1",
    });
    const b = outboundIdempotencyKey({
      purpose: "appointment.confirmed",
      recipient: "user@example.com",
      eventId: "evt-1",
    });
    expect(a).toBe(b);
    expect(a).toBe("appointment.confirmed:user@example.com:evt-1");
  });

  it("differs when recipient or event changes", () => {
    const base = outboundIdempotencyKey({
      purpose: "payment.received",
      recipient: "user@example.com",
      eventId: "evt-1",
    });
    const otherRecipient = outboundIdempotencyKey({
      purpose: "payment.received",
      recipient: "other@example.com",
      eventId: "evt-1",
    });
    const otherEvent = outboundIdempotencyKey({
      purpose: "payment.received",
      recipient: "user@example.com",
      eventId: "evt-2",
    });
    expect(otherRecipient).not.toBe(base);
    expect(otherEvent).not.toBe(base);
  });

  it("hashes composite keys deterministically", () => {
    expect(hashIdempotencyKey("a", "b", "c")).toBe(hashIdempotencyKey("a", "b", "c"));
    expect(hashIdempotencyKey("a", "b")).not.toBe(hashIdempotencyKey("a", "c"));
  });

  it("scopes job keys by type", () => {
    expect(jobIdempotencyKey("OUTBOUND_EMAIL", "abc")).toBe("OUTBOUND_EMAIL:abc");
    expect(jobIdempotencyKey("OUTBOUND_SMS", "abc")).not.toBe("OUTBOUND_EMAIL:abc");
  });
});
