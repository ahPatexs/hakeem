/**
 * Stitch-aligned SOAP panel shell — mounts existing doctor SOAP flows via props.
 * Do not redesign; keep consultation workspace as primary authoring surface.
 */
export function SoapNotePanel({
  title,
  status,
  children,
}: {
  title: string;
  status?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-outline-variant/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-headline text-lg text-primary">{title}</h2>
        {status ? <span className="text-xs text-on-surface-variant">{status}</span> : null}
      </div>
      {children}
    </section>
  );
}
