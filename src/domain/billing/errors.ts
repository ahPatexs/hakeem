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
