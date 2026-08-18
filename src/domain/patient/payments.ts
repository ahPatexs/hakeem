import type { PaymentStatus } from "@prisma/client";
import { assertCanPay as assertCanPayDomain } from "@/domain/billing/eligibility";
import { PaymentDomainError } from "@/domain/billing/errors";

export type { PaymentStatus };
export { PaymentDomainError };

export type PaymentDomainErrorCode = "NOT_FOUND" | "PAYMENT_CONFLICT" | "PAYMENT_FAILED" | "FORBIDDEN";

export interface PayableObligation {
  id: string;
  patientUserId: string;
  status: PaymentStatus;
  amountCents?: number;
}

export function assertCanPay(obligation: PayableObligation, patientUserId: string): void {
  assertCanPayDomain(
    {
      id: obligation.id,
      patientUserId: obligation.patientUserId,
      status: obligation.status,
      amountCents: obligation.amountCents ?? 0,
    },
    patientUserId,
  );
}
