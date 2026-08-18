import { describe, expect, it } from "vitest";
import { EARNINGS_COUNTED_STATUSES, earningsNet, summarizeEarnings } from "@/domain/billing/earnings";

describe("doctor earnings math", () => {
  it("excludes Failed and Cancelled from counted statuses", () => {
    expect(EARNINGS_COUNTED_STATUSES).not.toContain("FAILED");
    expect(EARNINGS_COUNTED_STATUSES).not.toContain("CANCELLED");
    expect(EARNINGS_COUNTED_STATUSES).not.toContain("PENDING");
    expect(EARNINGS_COUNTED_STATUSES).toContain("PAID");
  });

  it("subtracts refunds from gross", () => {
    const summary = summarizeEarnings([
      { amountCents: 15000, refundedAmountCents: 0 },
      { amountCents: 15000, refundedAmountCents: 5000 },
    ]);
    expect(summary.grossCents).toBe(30000);
    expect(summary.refundCents).toBe(5000);
    expect(summary.netCents).toBe(25000);
    expect(summary.visits).toBe(2);
    expect(earningsNet(15000, 5000)).toBe(10000);
  });
});
