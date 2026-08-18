import { describe, expect, it } from "vitest";
import { assertCanJoinAppointment } from "@/domain/billing/eligibility";
import { PaymentDomainError } from "@/domain/billing/errors";

describe("appointment payment gate", () => {
  it("blocks unpaid payable appointments", () => {
    expect(() => assertCanJoinAppointment({ amountCents: 15000, status: "PENDING" })).toThrow(PaymentDomainError);
    expect(() => assertCanJoinAppointment({ amountCents: 15000, status: "PROCESSING" })).toThrow(PaymentDomainError);
    expect(() => assertCanJoinAppointment({ amountCents: 15000, status: "FAILED" })).toThrow(PaymentDomainError);
  });

  it("allows Paid, refunded, and zero-price visits", () => {
    expect(() => assertCanJoinAppointment({ amountCents: 15000, status: "PAID" })).not.toThrow();
    expect(() => assertCanJoinAppointment({ amountCents: 15000, status: "PARTIALLY_REFUNDED" })).not.toThrow();
    expect(() => assertCanJoinAppointment({ amountCents: 0, status: "PENDING" })).not.toThrow();
    expect(() => assertCanJoinAppointment({ amountCents: 15000, status: null })).not.toThrow();
  });
});
