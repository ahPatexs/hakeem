import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { emrGetPrescription } from "@/actions/emr/prescriptions";
import { DetailBackLink } from "@/components/patient/care/detail-back-link";
import { PrescriptionDetail } from "@/components/patient/prescriptions/prescriptions-list";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.prescriptions");

  const result = await emrGetPrescription({ prescriptionId: id });
  if (!result.ok) {
    if (result.code === "FORBIDDEN" || result.code === "NOT_FOUND") notFound();
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div>
      <DetailBackLink href="/patient/prescriptions" label={t("backToList")} />
      <PrescriptionDetail rx={result.data} locale={locale} />
    </div>
  );
}
