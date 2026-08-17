import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { emrGetLabResult } from "@/actions/emr/diagnostics";
import { DetailBackLink } from "@/components/patient/care/detail-back-link";
import { LabDetail } from "@/components/patient/labs/labs-list";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function LabDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.labs");

  const result = await emrGetLabResult({ labResultId: id });
  if (!result.ok) {
    if (result.code === "FORBIDDEN" || result.code === "NOT_FOUND") notFound();
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div>
      <DetailBackLink href="/patient/labs" label={t("backToList")} />
      <LabDetail lab={result.data} locale={locale} />
    </div>
  );
}
