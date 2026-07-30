import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getChart } from "@/actions/doctor/patients";
import { ErrorState, StatusBadge } from "@/components/doctor/shared";

export default async function PatientLabsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.chart");

  const result = await getChart({ patientUserId: id });
  if (!result.ok) {
    return <ErrorState title={t("labs")} message={t("accessDenied")} />;
  }

  const chart = result.data;
  const fmtDateTime = (d: Date | string) =>
    new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/doctor/patients/${id}`}
          className="text-sm font-medium text-med-green hover:underline"
        >
          ← {t("backToChart")}
        </Link>
        <h1 className="mt-2 font-headline text-2xl text-primary md:text-3xl">
          {t("labs")} — {chart.user.name ?? chart.user.email}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          <Link href="/doctor/labs" className="text-med-green hover:underline">
            {t("viewLabInbox")}
          </Link>
        </p>
      </div>

      {chart.labs.length === 0 ? (
        <p className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 text-sm text-on-surface-variant">
          {t("emptyLabs")}
        </p>
      ) : (
        <ul className="space-y-3">
          {chart.labs.map((lab) => (
            <li
              key={lab.id}
              className="glass-card flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4"
            >
              <div className="min-w-0">
                <p className="font-medium text-primary">
                  {lab.title}
                  {lab.criticalFlag ? (
                    <span className="ms-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">
                      {t("critical")}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-on-surface-variant">{fmtDateTime(lab.resultedAt)}</p>
              </div>
              <StatusBadge
                status={lab.releaseStatus}
                label={lab.releaseStatus === "PENDING_REVIEW" ? t("pendingReview") : undefined}
                variant="lab"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
