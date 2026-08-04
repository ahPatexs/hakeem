export type PrescriptionListItem = {
  id: string;
  medicationName: string;
  instructions?: string | null;
  status: string;
  prescribedAt: Date | string;
};

const RENEWABLE_STATUSES = new Set(["ACTIVE", "COMPLETED", "EXPIRED"]);

export function PrescriptionList({
  items,
  title,
  emptyLabel,
  locale = "en",
  renewLabel,
  onRenew,
}: {
  items: PrescriptionListItem[];
  title: string;
  emptyLabel: string;
  locale?: string;
  /** Optional doctor-facing renew CTA label; shown per-item when `onRenew` is provided (T126). */
  renewLabel?: string;
  onRenew?: (prescriptionId: string) => void;
}) {
  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { dateStyle: "medium" });

  return (
    <section className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-outline-variant/15">
          {items.map((rx) => (
            <li key={rx.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate font-medium text-primary">{rx.medicationName}</p>
                {rx.instructions ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-on-surface-variant">
                    {rx.instructions}
                  </p>
                ) : null}
                <p className="mt-1 text-xs uppercase tracking-wide text-on-surface-variant">
                  {rx.status}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <time className="text-xs text-on-surface-variant">{fmtDate(rx.prescribedAt)}</time>
                {onRenew && renewLabel && RENEWABLE_STATUSES.has(rx.status) ? (
                  <button
                    type="button"
                    onClick={() => onRenew(rx.id)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {renewLabel}
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
