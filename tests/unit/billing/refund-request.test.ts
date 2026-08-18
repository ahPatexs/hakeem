import { describe, expect, it } from "vitest";
import { assertPatientRefundEligible } from "@/domain/billing/eligibility";
import { PaymentDomainError } from "@/domain/billing/errors";

describe("patient refund request eligibility", () => {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  const past = new Date(Date.now() - 60 * 60 * 1000);

  it("allows request when appointment cancelled before start and remaining balance exists", () => {
    expect(() =>
      assertPatientRefundEligible({
        status: "PAID",
        remainingCents: 15000,
        appointmentStatus: "CANCELLED",
        appointmentStartAt: future,
      }),
    ).not.toThrow();
  });

  it("does not move money — eligibility only; blocks ineligible cases", () => {
    expect(() =>
      assertPatientRefundEligible({
        status: "PAID",
        remainingCents: 15000,
        appointmentStatus: "CONFIRMED",
        appointmentStartAt: future,
      }),
    ).toThrow(PaymentDomainError);
    expect(() =>
      assertPatientRefundEligible({
        status: "PAID",
        remainingCents: 15000,
        appointmentStatus: "CANCELLED",
        appointmentStartAt: past,
      }),
    ).toThrow(PaymentDomainError);
    expect(() =>
      assertPatientRefundEligible({
        status: "PENDING",
        remainingCents: 15000,
        appointmentStatus: "CANCELLED",
        appointmentStartAt: future,
      }),
    ).toThrow(PaymentDomainError);
  });
});
