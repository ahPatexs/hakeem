import type { PaymentStatus } from "@prisma/client";
import { AdminDomainError } from "@/domain/admin/errors";
import { REFUNDABLE_STATUSES } from "@/lib/admin/dashboard";

export function refundableBalance(amountCents: number, refundedAmountCents: number) {
  return Math.max(0, amountCents - refundedAmountCents);
}

export function assertRefundable(status: PaymentStatus, amountCents: number, refundedAmountCents: number) {
  if (!REFUNDABLE_STATUSES.includes(status)) {
    throw new AdminDomainError("REFUND_NOT_ALLOWED");
  }
  if (refundableBalance(amountCents, refundedAmountCents) <= 0) {
    throw new AdminDomainError("REFUND_NOT_ALLOWED");
  }
}

export function assertRefundAmount(
  amountCents: number,
  refundedAmountCents: number,
  refundCents: number,
) {
  const balance = refundableBalance(amountCents, refundedAmountCents);
  if (refundCents < 1 || refundCents > balance) {
    throw new AdminDomainError("REFUND_EXCEEDS_BALANCE");
  }
}

export function nextPaymentStatus(amountCents: number, newRefundedTotal: number): PaymentStatus {
  if (newRefundedTotal >= amountCents) return "REFUNDED";
  if (newRefundedTotal > 0) return "PARTIALLY_REFUNDED";
  return "PAID";
}

export function revenueNet(grossCents: number, refundCents: number) {
  return grossCents - refundCents;
}
