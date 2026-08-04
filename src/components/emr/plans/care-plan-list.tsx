export type CarePlanListItem = {
  id: string;
  title: string;
  kind?: string | null;
  status: string;
  version: number;
  updatedAt: Date | string;
};

export function CarePlanList({
  items,
  title,
  emptyLabel,
  locale = "en",
}: {
  items: CarePlanListItem[];
  title: string;
  emptyLabel: string;
  locale?: string;
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
          {items.map((plan) => (
            <li key={plan.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate font-medium text-primary">{plan.title}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-on-surface-variant">
                  {plan.status}
                  {plan.kind ? ` · ${plan.kind}` : ""} · v{plan.version}
                </p>
              </div>
              <time className="shrink-0 text-xs text-on-surface-variant">{fmtDate(plan.updatedAt)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
