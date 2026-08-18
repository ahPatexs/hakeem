export type DoctorEarningsRow = {
  obligationId: string;
  appointmentId: string | null;
  amountCents: number;
  refundedAmountCents: number;
  netCents: number;
  status: string;
  description: string;
  createdAt: Date;
};

export function earningsNet(amountCents: number, refundedAmountCents: number): number {
  return Math.max(0, amountCents - refundedAmountCents);
}

export function summarizeEarnings(rows: Array<{ amountCents: number; refundedAmountCents: number }>): {
  grossCents: number;
  refundCents: number;
  netCents: number;
  visits: number;
} {
  const grossCents = rows.reduce((s, r) => s + r.amountCents, 0);
  const refundCents = rows.reduce((s, r) => s + r.refundedAmountCents, 0);
  return {
    grossCents,
    refundCents,
    netCents: grossCents - refundCents,
    visits: rows.length,
  };
}

export const EARNINGS_COUNTED_STATUSES = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"] as const;
