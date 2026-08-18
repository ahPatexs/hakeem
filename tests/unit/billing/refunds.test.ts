import { describe, expect, it } from "vitest";
import { assertRefundAmount, refundableBalance } from "@/domain/admin/billing";
import { AdminDomainError } from "@/domain/admin/errors";

describe("refund remaining balance", () => {
  it("allows partial then remainder", () => {
    expect(refundableBalance(10_000, 4_000)).toBe(6_000);
    expect(() => assertRefundAmount(10_000, 4_000, 6_000)).not.toThrow();
  });

  it("blocks over-refund", () => {
    expect(() => assertRefundAmount(10_000, 4_000, 6_001)).toThrow(AdminDomainError);
  });
});
