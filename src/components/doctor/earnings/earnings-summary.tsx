import { PaymentStatusBadge } from "@/components/platform/payments/payment-status-badge";

export function EarningsSummary({
  grossCents,
  refundCents,
  netCents,
  visits,
  labels,
}: {
  grossCents: number;
  refundCents: number;
  netCents: number;
  visits: number;
  labels: { gross: string; refunds: string; net: string; visits: string };
}) {
  const cards = [
    { label: labels.gross, value: (grossCents / 100).toFixed(2) },
    { label: labels.refunds, value: (refundCents / 100).toFixed(2) },
    { label: labels.net, value: (netCents / 100).toFixed(2) },
    { label: labels.visits, value: String(visits) },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4"
        >
          <p className="text-sm text-on-surface-variant">{c.label}</p>
          <p className="mt-1 font-headline text-2xl text-primary">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

export function EarningsTable({
  rows,
  empty,
  labels,
}: {
  rows: Array<{
    id: string;
    description: string;
    amountCents: number;
    refundedAmountCents: number;
    netCents: number;
    status: string;
    patientLabel?: string;
  }>;
  empty: string;
  labels: { visit: string; patient: string; gross: string; refunds: string; net: string; status: string };
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-on-surface-variant">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-outline-variant/20">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface-container-high/60">
          <tr>
            <th className="px-4 py-3 font-semibold text-primary">{labels.visit}</th>
            <th className="px-4 py-3 font-semibold text-primary">{labels.patient}</th>
            <th className="px-4 py-3 font-semibold text-primary">{labels.gross}</th>
            <th className="px-4 py-3 font-semibold text-primary">{labels.refunds}</th>
            <th className="px-4 py-3 font-semibold text-primary">{labels.net}</th>
            <th className="px-4 py-3 font-semibold text-primary">{labels.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-outline-variant/10">
              <td className="px-4 py-3">{r.description}</td>
              <td className="px-4 py-3">{r.patientLabel || "—"}</td>
              <td className="px-4 py-3">{(r.amountCents / 100).toFixed(2)} SAR</td>
              <td className="px-4 py-3">{(r.refundedAmountCents / 100).toFixed(2)} SAR</td>
              <td className="px-4 py-3">{(r.netCents / 100).toFixed(2)} SAR</td>
              <td className="px-4 py-3">
                <PaymentStatusBadge status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
