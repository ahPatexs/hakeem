import { describe, expect, it } from "vitest";
import { assertFailedRetryAllowed } from "@/domain/billing/eligibility";
import { FAILED_RETRY_MAX } from "@/domain/billing/constants";
import { PaymentDomainError } from "@/domain/billing/errors";

describe("failed payment retry limit", () => {
  it("allows fewer than 5 failed attempts in the window", () => {
    expect(() => assertFailedRetryAllowed(FAILED_RETRY_MAX - 1)).not.toThrow();
  });

  it("rate-limits at 5 failed attempts", () => {
    expect(() => assertFailedRetryAllowed(FAILED_RETRY_MAX)).toThrow(PaymentDomainError);
    try {
      assertFailedRetryAllowed(FAILED_RETRY_MAX);
    } catch (error) {
      expect(error).toBeInstanceOf(PaymentDomainError);
      expect((error as PaymentDomainError).message).toBe("RATE_LIMITED");
    }
  });
});
