import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { getLab } from "@/actions/patient/labs";
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

  const result = await getLab(id);
  if (!result.ok) {
    if (result.code === "FORBIDDEN") notFound();
    return <ErrorState title={t("loadError")} />;
  }

  return <LabDetail lab={result.data} />;
}
