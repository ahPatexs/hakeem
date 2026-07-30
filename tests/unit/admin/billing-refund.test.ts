import { describe, expect, it } from "vitest";
import {
  assertRefundAmount,
  assertRefundable,
  nextPaymentStatus,
  refundableBalance,
} from "@/domain/admin/billing";
import { AdminDomainError } from "@/domain/admin/errors";

describe("billing refund rules", () => {
  it("computes refundable balance", () => {
    expect(refundableBalance(10000, 3000)).toBe(7000);
    expect(refundableBalance(10000, 10000)).toBe(0);
  });

  it("blocks over-refund", () => {
    assertRefundable("PAID", 10000, 0);
    expect(() => assertRefundAmount(10000, 0, 10001)).toThrow(AdminDomainError);
    expect(() => assertRefundAmount(10000, 5000, 6000)).toThrow(AdminDomainError);
  });

  it("derives next payment status", () => {
    expect(nextPaymentStatus(10000, 5000)).toBe("PARTIALLY_REFUNDED");
    expect(nextPaymentStatus(10000, 10000)).toBe("REFUNDED");
  });
});
