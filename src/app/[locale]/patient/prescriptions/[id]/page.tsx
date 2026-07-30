import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getPrescription } from "@/actions/patient/prescriptions";
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

  const result = await getPrescription(id);
  if (!result.ok) {
    if (result.code === "FORBIDDEN") notFound();
    return <ErrorState title={t("loadError")} />;
  }

  return <PrescriptionDetail rx={result.data} />;
}
