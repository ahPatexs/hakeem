/**
 * Read-only version history list for signed clinical artifacts (T106).
 * Stitch-aligned list chrome — no redesign.
 */
export type VersionHistoryItem = {
  id: string;
  version: number;
  status: string;
  labeledAt: Date | string;
  reason?: string | null;
};

export function VersionHistoryList({
  title,
  items,
  emptyLabel,
  locale = "en",
}: {
  title: string;
  items: VersionHistoryItem[];
  emptyLabel: string;
  locale?: string;
}) {
  const fmt = (d: Date | string) =>
    new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <section className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h3 className="font-headline text-base text-primary">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{emptyLabel}</p>
      ) : (
        <ol className="divide-y divide-outline-variant/15">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-primary">
                  v{item.version} · {item.status}
                </p>
                {item.reason ? (
                  <p className="text-xs text-on-surface-variant">{item.reason}</p>
                ) : null}
              </div>
              <time className="shrink-0 text-xs text-on-surface-variant">{fmt(item.labeledAt)}</time>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
