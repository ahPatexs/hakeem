import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { emrGetMedicalRecord } from "@/actions/emr/records";
import { RecordDetail } from "@/components/patient/records/records-list";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.records");

  const result = await emrGetMedicalRecord({ recordId: id });
  if (!result.ok) {
    if (result.code === "FORBIDDEN" || result.code === "NOT_FOUND") notFound();
    return <ErrorState title={t("loadError")} />;
  }

  return <RecordDetail record={result.data} />;
}
