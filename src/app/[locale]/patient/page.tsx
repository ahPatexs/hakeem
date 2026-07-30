import { setRequestLocale, getTranslations } from "next-intl/server";
import { getDashboard } from "@/actions/patient/dashboard";
import { DashboardGrid } from "@/components/patient/dashboard/dashboard-grid";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function PatientDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.dashboard");

  const result = await getDashboard();
  if (!result.ok) {
    return (
      <ErrorState title={t("loadErrorTitle")} message={t("loadError")} />
    );
  }

  return <DashboardGrid bundle={result.data} />;
}
