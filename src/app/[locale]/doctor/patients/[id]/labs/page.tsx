import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getChart } from "@/actions/doctor/patients";
import { emrListLabResults } from "@/actions/emr/diagnostics";
import { ErrorState } from "@/components/doctor/shared";
import { LabResultsList } from "@/components/emr";

export default async function PatientLabsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.chart");

  const [result, labsResult] = await Promise.all([
    getChart({ patientUserId: id }),
    emrListLabResults({ patientUserId: id }),
  ]);
  if (!result.ok) {
    return <ErrorState title={t("labs")} message={t("accessDenied")} />;
  }

  const chart = result.data;
  const labs = labsResult.ok ? labsResult.data.items : [];

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

      <LabResultsList
        items={labs.map((lab) => ({
          id: lab.id,
          title: lab.title,
          releaseStatus: lab.releaseStatus,
          phase: lab.phase,
          criticalFlag: lab.criticalFlag,
          resultedAt: lab.resultedAt,
          summary: lab.summary,
        }))}
        title={t("labs")}
        emptyLabel={t("emptyLabs")}
        locale={locale}
        criticalLabel={t("critical")}
      />
    </div>
  );
}
