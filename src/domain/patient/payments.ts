export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type PaymentDomainErrorCode = "NOT_FOUND" | "PAYMENT_CONFLICT" | "PAYMENT_FAILED" | "FORBIDDEN";

export class PaymentDomainError extends Error {
  constructor(
    public readonly code: PaymentDomainErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "PaymentDomainError";
  }
}

export interface PayableObligation {
  id: string;
  patientUserId: string;
  status: PaymentStatus;
}

export function assertCanPay(obligation: PayableObligation, patientUserId: string): void {
  if (obligation.patientUserId !== patientUserId) {
    throw new PaymentDomainError("NOT_FOUND");
  }
  if (obligation.status === "PAID") {
    throw new PaymentDomainError("PAYMENT_CONFLICT", "Payment obligation is already paid");
  }
  if (obligation.status === "REFUNDED") {
    throw new PaymentDomainError("PAYMENT_FAILED", "Payment obligation was refunded");
  }
  if (obligation.status !== "PENDING" && obligation.status !== "FAILED") {
    throw new PaymentDomainError("PAYMENT_FAILED", "Payment obligation cannot be paid in its current state");
  }
}
