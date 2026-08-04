export type LabResultListItem = {
  id: string;
  title: string;
  releaseStatus: string;
  phase?: string | null;
  criticalFlag?: boolean;
  resultedAt: Date | string;
  summary?: string | null;
};

export function LabResultsList({
  items,
  title,
  emptyLabel,
  locale = "en",
  criticalLabel = "Critical",
}: {
  items: LabResultListItem[];
  title: string;
  emptyLabel: string;
  locale?: string;
  criticalLabel?: string;
}) {
  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <section className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-outline-variant/15">
          {items.map((lab) => (
            <li key={lab.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-medium text-primary">
                  {lab.title}
                  {lab.criticalFlag ? (
                    <span className="ms-2 text-xs font-medium text-warm-coral">{criticalLabel}</span>
                  ) : null}
                </p>
                {lab.summary ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-on-surface-variant">{lab.summary}</p>
                ) : null}
                <p className="mt-1 text-xs uppercase tracking-wide text-on-surface-variant">
                  {[lab.releaseStatus, lab.phase].filter(Boolean).join(" · ")}
                </p>
              </div>
              <time className="shrink-0 text-xs text-on-surface-variant">{fmtDate(lab.resultedAt)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
