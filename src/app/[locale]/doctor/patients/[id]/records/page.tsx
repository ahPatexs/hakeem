import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getChart } from "@/actions/doctor/patients";
import { ErrorState } from "@/components/doctor/shared";

export default async function DoctorPatientRecordsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.chart");
  const isAr = locale === "ar";

  const result = await getChart({ patientUserId: id });
  if (!result.ok) {
    return <ErrorState title={t("recordsTitle")} message={t("accessDenied")} />;
  }

  const chart = result.data;
  const fmtDate = (d: Date | string) =>
    new Date(d).toLocaleDateString(isAr ? "ar-SA" : "en-US", { dateStyle: "medium" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("recordsTitle")}</h1>
          <p className="mt-1 text-on-surface-variant">
            {chart.user.name ?? chart.user.email}
          </p>
        </div>
        <Link
          href={`/doctor/patients/${id}`}
          className="rounded-full border border-outline-variant/40 px-4 py-2 text-sm font-medium text-primary hover:bg-surface-container-high"
        >
          {t("backToChart")}
        </Link>
      </div>

      {chart.records.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{t("emptyTimeline")}</p>
      ) : (
        <ul className="divide-y divide-outline-variant/15 rounded-2xl border border-outline-variant/20 bg-surface-container-low">
          {chart.records.map((record) => (
            <li key={record.id} className="px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-primary">{record.title}</p>
                  {record.recordType ? (
                    <p className="mt-0.5 text-xs uppercase text-on-surface-variant">{record.recordType}</p>
                  ) : null}
                </div>
                <p className="shrink-0 text-xs text-on-surface-variant">{fmtDate(record.recordedAt)}</p>
              </div>
              {record.summary ? (
                <p className="mt-2 text-sm text-on-surface-variant">{record.summary}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
