export type DocumentListItem = {
  id: string;
  title: string;
  kind?: string | null;
  classification?: string | null;
  createdAt: Date | string;
};

export function DocumentList({
  items,
  title,
  emptyLabel,
  locale = "en",
}: {
  items: DocumentListItem[];
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
          {items.map((doc) => (
            <li key={doc.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="font-medium text-primary">{doc.title}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {[doc.kind, doc.classification].filter(Boolean).join(" · ")}
                </p>
              </div>
              <time className="shrink-0 text-xs text-on-surface-variant">{fmtDate(doc.createdAt)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
