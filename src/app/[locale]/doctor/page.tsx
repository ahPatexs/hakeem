import { setRequestLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getDoctorDashboard } from "@/actions/doctor/dashboard";
import { DashboardWidgets } from "@/components/doctor/dashboard/widgets";
import { ErrorState } from "@/components/doctor/shared";

export default async function DoctorDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.dashboard");

  const result = await getDoctorDashboard();
  if (!result.ok) {
    return <ErrorState title={t("loadErrorTitle")} message={t("loadError")} />;
  }

  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest px-5 py-6 shadow-sm md:px-8 md:py-8">
        <h1 className="font-headline text-2xl text-on-surface md:text-3xl">{t("welcome", { name })}</h1>
        <p className="mt-2 text-on-surface-variant">{t("subtitle")}</p>
      </div>
      <DashboardWidgets bundle={result.data} />
    </div>
  );
}
