import { Link } from "@/i18n/routing";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

export type PickVisitItem = {
  id: string;
  startAt: Date;
  status: string;
  reason: string | null;
  mode: string;
};

function visitKind(status: string): "live" | "upcoming" | "done" {
  if (status === "IN_PROGRESS" || status === "CHECKED_IN") return "live";
  if (status === "CONFIRMED") return "upcoming";
  return "done";
}

export function PickVisit({
  visits,
  patientId,
  aiMode,
  title,
  hint,
  emptyTitle,
  scheduleHref,
  scheduleLabel,
  liveLabel,
  upcomingLabel,
  doneLabel,
  locale,
}: {
  visits: PickVisitItem[];
  patientId: string;
  aiMode: string;
  title: string;
  hint: string;
  emptyTitle: string;
  scheduleHref: string;
  scheduleLabel: string;
  liveLabel: string;
  upcomingLabel: string;
  doneLabel: string;
  locale: string;
}) {
  const fmt = (d: Date) =>
    new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  const ordered = [...visits].sort((a, b) => {
    const rank = { live: 0, upcoming: 1, done: 2 };
    const diff = rank[visitKind(a.status)] - rank[visitKind(b.status)];
    if (diff !== 0) return diff;
    return new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
  });

  return (
    <section className={cn(portalCardClass, "p-5")}>
      <h2 className="font-headline text-lg text-primary">{title}</h2>
      <p className="mt-1 text-sm text-on-surface-variant">{hint}</p>
      {ordered.length === 0 ? (
        <div className="mt-4 text-center">
          <p className="text-sm text-on-surface-variant">{emptyTitle}</p>
          <Link href={scheduleHref} className="mt-2 inline-block text-sm font-semibold text-med-green hover:underline">
            {scheduleLabel}
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {ordered.map((visit) => {
            const kind = visitKind(visit.status);
            const kindLabel = kind === "live" ? liveLabel : kind === "upcoming" ? upcomingLabel : doneLabel;
            return (
              <li key={visit.id}>
                <Link
                  href={`/doctor/ai?mode=${aiMode}&patient=${patientId}&appointment=${visit.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/20 px-3 py-2.5 hover:bg-surface-container-low"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-primary">{fmt(visit.startAt)}</span>
                    {visit.reason ? (
                      <span className="block truncate text-xs text-on-surface-variant">{visit.reason}</span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      kind === "live" ? "bg-med-green/15 text-med-green" : "bg-primary/10 text-primary",
                    )}
                  >
                    {kindLabel}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
