import { setRequestLocale, getTranslations } from "next-intl/server";
import { getDoctorProfile, updateDoctorSettings } from "@/actions/doctor/profile";
import { PortalSettingsForm } from "@/components/portal/portal-settings-form";
import { ErrorState } from "@/components/doctor/shared";

export default async function DoctorSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.settings");

  const result = await getDoctorProfile();
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="welcome-banner space-y-2 p-5 sm:p-7">
        <p className="text-sm font-medium text-white/80">{t("subtitle")}</p>
        <h1 className="font-headline text-2xl text-white md:text-3xl">{t("title")}</h1>
      </section>
      <PortalSettingsForm
        settings={result.data.settings}
        namespace="doctor.settings"
        onSave={updateDoctorSettings}
      />
    </div>
  );
}
