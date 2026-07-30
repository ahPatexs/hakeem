import { describe, expect, it } from "vitest";
import { assertRefundAmount } from "@/domain/admin/billing";
import { AdminDomainError } from "@/domain/admin/errors";

describe("refund integration", () => {
  it("allows partial then remainder and blocks over-refund", () => {
    expect(() => assertRefundAmount(10_000, 0, 4_000)).not.toThrow();
    expect(() => assertRefundAmount(10_000, 4_000, 6_000)).not.toThrow();
    expect(() => assertRefundAmount(10_000, 4_000, 6_001)).toThrow(AdminDomainError);
    expect(() => assertRefundAmount(10_000, 10_000, 1)).toThrow(AdminDomainError);
  });
});
