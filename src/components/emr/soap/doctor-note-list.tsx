/**
 * Doctor free-text note list (T044). Signed SOAP remains the clinical SoT;
 * DoctorNote covers unstructured clinician notes beside SOAP.
 */
export type DoctorNoteListItem = {
  id: string;
  status: string;
  version: number;
  bodyPreview: string;
  updatedAt: Date | string;
};

export function DoctorNoteList({
  items,
  title,
  emptyLabel,
  locale = "en",
}: {
  items: DoctorNoteListItem[];
  title: string;
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
      <h2 className="font-headline text-lg text-primary">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-outline-variant/15">
          {items.map((note) => (
            <li key={note.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm text-primary">{note.bodyPreview || "—"}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-on-surface-variant">
                  {note.status} · v{note.version}
                </p>
              </div>
              <time className="shrink-0 text-xs text-on-surface-variant">{fmt(note.updatedAt)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
