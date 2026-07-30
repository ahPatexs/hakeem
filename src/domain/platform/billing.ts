import type { PaymentStatus } from "@prisma/client";

export {
  assertRefundAmount,
  assertRefundable,
  nextPaymentStatus,
  refundableBalance,
  revenueNet,
} from "@/domain/admin/billing";

const ALLOWED: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PAID", "FAILED"],
  PAID: ["PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"],
  FAILED: ["PAID", "PENDING"],
  PARTIALLY_REFUNDED: ["REFUNDED", "DISPUTED"],
  REFUNDED: [],
  DISPUTED: [],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

/** Idempotent paid transition; rejects illegal backward moves. */
export function applyPaidTransition(from: PaymentStatus): PaymentStatus {
  if (from === "PAID") return "PAID";
  if (!canTransition(from, "PAID")) {
    throw new Error("PAYMENT_TRANSITION_DENIED");
  }
  return "PAID";
}

export function applyFailedTransition(from: PaymentStatus): PaymentStatus {
  if (from === "FAILED") return "FAILED";
  if (from === "PAID" || from === "REFUNDED" || from === "PARTIALLY_REFUNDED" || from === "DISPUTED") {
    throw new Error("PAYMENT_TRANSITION_DENIED");
  }
  return "FAILED";
}
