import type { PaymentStatus } from "@prisma/client";

export {
  assertRefundAmount,
  assertRefundable,
  nextPaymentStatus,
  refundableBalance,
  revenueNet,
} from "@/domain/admin/billing";

const ALLOWED: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["PROCESSING", "PAID", "FAILED", "CANCELLED"],
  PROCESSING: ["PAID", "FAILED", "CANCELLED"],
  FAILED: ["PROCESSING", "PAID"],
  PAID: ["PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"],
  PARTIALLY_REFUNDED: ["PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"],
  REFUNDED: [],
  CANCELLED: [],
  DISPUTED: [],
};

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

export function applyProcessingTransition(from: PaymentStatus): PaymentStatus {
  if (from === "PROCESSING") return "PROCESSING";
  if (!canTransition(from, "PROCESSING")) {
    throw new Error("PAYMENT_TRANSITION_DENIED");
  }
  return "PROCESSING";
}

export function applyPaidTransition(from: PaymentStatus): PaymentStatus {
  if (from === "PAID") return "PAID";
  if (!canTransition(from, "PAID")) {
    throw new Error("PAYMENT_TRANSITION_DENIED");
  }
  return "PAID";
}

export function applyFailedTransition(from: PaymentStatus): PaymentStatus {
  if (from === "FAILED") return "FAILED";
  if (!canTransition(from, "FAILED")) {
    throw new Error("PAYMENT_TRANSITION_DENIED");
  }
  return "FAILED";
}

export function applyCancelledTransition(from: PaymentStatus): PaymentStatus {
  if (from === "CANCELLED") return "CANCELLED";
  if (!canTransition(from, "CANCELLED")) {
    throw new Error("PAYMENT_TRANSITION_DENIED");
  }
  return "CANCELLED";
}
