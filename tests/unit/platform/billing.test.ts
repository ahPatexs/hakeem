import { describe, expect, it } from "vitest";
import {
  applyFailedTransition,
  applyPaidTransition,
  assertRefundAmount,
  assertRefundable,
  canTransition,
  nextPaymentStatus,
  refundableBalance,
} from "@/domain/platform/billing";
import { AdminDomainError } from "@/domain/admin/errors";

describe("platform billing transitions", () => {
  it("computes refundable balance", () => {
    expect(refundableBalance(10_000, 3_000)).toBe(7_000);
    expect(refundableBalance(10_000, 10_000)).toBe(0);
  });

  it("blocks over-refund", () => {
    assertRefundable("PAID", 10_000, 0);
    expect(() => assertRefundAmount(10_000, 0, 10_001)).toThrow(AdminDomainError);
  });

  it("derives next payment status after refunds", () => {
    expect(nextPaymentStatus(10_000, 5_000)).toBe("PARTIALLY_REFUNDED");
    expect(nextPaymentStatus(10_000, 10_000)).toBe("REFUNDED");
  });

  it("allows legal forward transitions only", () => {
    expect(canTransition("PENDING", "PAID")).toBe(true);
    expect(canTransition("PAID", "PENDING")).toBe(false);
    expect(canTransition("PAID", "PARTIALLY_REFUNDED")).toBe(true);
  });

  it("applyPaidTransition is idempotent and rejects backward moves", () => {
    expect(applyPaidTransition("PAID")).toBe("PAID");
    expect(applyPaidTransition("PENDING")).toBe("PAID");
    expect(() => applyPaidTransition("REFUNDED")).toThrow("PAYMENT_TRANSITION_DENIED");
  });

  it("applyFailedTransition rejects paid/refunded states", () => {
    expect(applyFailedTransition("PENDING")).toBe("FAILED");
    expect(() => applyFailedTransition("PAID")).toThrow("PAYMENT_TRANSITION_DENIED");
  });
});
