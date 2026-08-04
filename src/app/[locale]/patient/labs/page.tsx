import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { emrListLabResults } from "@/actions/emr/diagnostics";
import { LabResultsList } from "@/components/emr/labs/lab-results-list";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function LabsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.labs");
  const temr = await getTranslations("emr");
  const session = await auth();
  const patientUserId = session?.user?.id;
  if (!patientUserId) {
    return <ErrorState title={t("loadError")} />;
  }

  const page = Number(sp.page ?? "1") || 1;
  const result = await emrListLabResults({ patientUserId, page });
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
      <LabResultsList
        items={result.data.items.map((lab) => ({
          id: lab.id,
          title: lab.title,
          releaseStatus: lab.releaseStatus,
          phase: lab.phase,
          criticalFlag: lab.criticalFlag,
          resultedAt: lab.resultedAt,
          summary: lab.summary,
        }))}
        title={temr("labs.title")}
        emptyLabel={temr("empty")}
        locale={locale}
      />
    </div>
  );
}
