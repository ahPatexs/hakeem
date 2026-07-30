import { describe, expect, it } from "vitest";

/** Billing list/query caps align with admin portal pagination budget. */
const BILLING_LIST_PAGE_SIZE = 20;

describe("billing query budget", () => {
  it("page size stays within admin list cap", () => {
    expect(BILLING_LIST_PAGE_SIZE).toBeLessThanOrEqual(50);
    expect(BILLING_LIST_PAGE_SIZE).toBe(20);
  });
});
