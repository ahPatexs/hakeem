import type { AppointmentStatus, PaymentStatus } from "@prisma/client";
import { PaymentDomainError } from "@/domain/billing/errors";
import { FAILED_RETRY_MAX } from "@/domain/billing/constants";
import { refundableBalance } from "@/domain/admin/billing";

export type PayableObligation = {
  id: string;
  patientUserId: string;
  status: PaymentStatus;
  amountCents: number;
  refundedAmountCents?: number;
};

export function assertCanPay(obligation: PayableObligation, patientUserId: string): void {
  if (obligation.patientUserId !== patientUserId) {
    throw new PaymentDomainError("NOT_FOUND");
  }
  if (obligation.status === "PAID") {
    throw new PaymentDomainError("PAYMENT_CONFLICT", "Payment obligation is already paid");
  }
  if (obligation.status === "PROCESSING") {
    throw new PaymentDomainError("PAYMENT_CONFLICT", "Payment is already in progress");
  }
  if (obligation.status === "REFUNDED" || obligation.status === "PARTIALLY_REFUNDED") {
    throw new PaymentDomainError("PAYMENT_FAILED", "Payment obligation was refunded");
  }
  if (obligation.status === "CANCELLED") {
    throw new PaymentDomainError("PAYMENT_FAILED", "Payment obligation was cancelled");
  }
  if (obligation.status !== "PENDING" && obligation.status !== "FAILED") {
    throw new PaymentDomainError("PAYMENT_FAILED", "Payment obligation cannot be paid in its current state");
  }
}

export function assertFailedRetryAllowed(failedCountInWindow: number): void {
  if (failedCountInWindow >= FAILED_RETRY_MAX) {
    throw new PaymentDomainError("PAYMENT_FAILED", "RATE_LIMITED");
  }
}

export function assertCanJoinAppointment(input: {
  amountCents: number;
  status: PaymentStatus | null;
}): void {
  if (input.amountCents <= 0 || !input.status) return;
  if (input.status !== "PAID" && input.status !== "PARTIALLY_REFUNDED" && input.status !== "REFUNDED") {
    throw new PaymentDomainError("PAYMENT_CONFLICT", "UNPAID_APPOINTMENT");
  }
}

export function assertPatientRefundEligible(input: {
  status: PaymentStatus;
  remainingCents: number;
  appointmentStatus: AppointmentStatus | null;
  appointmentStartAt: Date | null;
  now?: Date;
}): void {
  if (input.remainingCents <= 0) {
    throw new PaymentDomainError("PAYMENT_FAILED", "No refundable balance");
  }
  if (input.status !== "PAID" && input.status !== "PARTIALLY_REFUNDED") {
    throw new PaymentDomainError("PAYMENT_FAILED", "Refund not available");
  }
  if (!input.appointmentStatus || !input.appointmentStartAt) {
    throw new PaymentDomainError("PAYMENT_FAILED", "Refund not available");
  }
  if (input.appointmentStatus !== "CANCELLED") {
    throw new PaymentDomainError("PAYMENT_FAILED", "Refund not available");
  }
  const now = input.now ?? new Date();
  if (now >= input.appointmentStartAt) {
    throw new PaymentDomainError("PAYMENT_FAILED", "Refund not available");
  }
}

export { refundableBalance };
