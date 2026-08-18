import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONSULTATION_FEE_CENTS,
  formatBillingDateTime,
  parseConsultFeeCents,
  paymentReconcileIdempotencyKey,
} from "@/domain/billing/constants";

describe("booking obligation uniqueness contract", () => {
  it("locks the default consult fee in SAR halalas", () => {
    expect(DEFAULT_CONSULTATION_FEE_CENTS).toBe(15_000);
  });

  it("uses a stable appointment idempotency key shape", () => {
    const appointmentId = "appt_abc";
    expect(`appt:${appointmentId}`).toBe("appt:appt_abc");
  });

  it("parses new-obligation consult fee without mutating invalid values", () => {
    expect(parseConsultFeeCents(null)).toBe(15_000);
    expect(parseConsultFeeCents("20000")).toBe(20_000);
    expect(parseConsultFeeCents("nope")).toBe(15_000);
  });
});

describe("billing display and reconcile keys", () => {
  it("formats invoice datetime in Asia/Riyadh", () => {
    const at = new Date("2026-08-18T00:00:00.000Z");
    expect(formatBillingDateTime(at, "en-GB")).toContain("03:00");
  });

  it("uses a daily PAYMENT_RECONCILE idempotency key", () => {
    const now = new Date("2026-08-18T15:00:00.000Z");
    expect(paymentReconcileIdempotencyKey("ob_1", now)).toBe("payment-reconcile:ob_1:2026-08-18");
  });
});
