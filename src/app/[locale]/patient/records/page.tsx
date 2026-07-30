import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listRecords, getMyActivityTimeline } from "@/actions/patient/records";
import { RecordsList } from "@/components/patient/records/records-list";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function RecordsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.records");

  const page = Number(sp.page ?? "1") || 1;
  const [result, timelineResult] = await Promise.all([
    listRecords({ page }),
    getMyActivityTimeline(),
  ]);
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  const timeline = timelineResult.ok ? timelineResult.data : [];
  const isAr = locale === "ar";
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(isAr ? "ar-SA" : "en-US", { dateStyle: "medium" });

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>

      {timeline.length > 0 ? (
        <section className="glass-card rounded-2xl border border-outline-variant/20 p-5">
          <h2 className="font-headline text-lg text-primary">{t("timelineTitle")}</h2>
          <ul className="mt-3 divide-y divide-outline-variant/15">
            {timeline.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium text-primary">{ev.title}</p>
                  <p className="text-xs text-on-surface-variant">{ev.kind}</p>
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-xs text-on-surface-variant">{fmtDate(ev.occurredAt)}</p>
                  {ev.href ? (
                    <Link href={ev.href} className="text-xs font-medium text-primary underline">
                      {t("openEvent")}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RecordsList
        items={result.data.items}
        total={result.data.total}
        page={result.data.page}
        pageSize={result.data.pageSize}
      />
    </div>
  );
}
