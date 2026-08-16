import { setRequestLocale, getTranslations } from "next-intl/server";
import { getPortalSettings, updatePortalSettings } from "@/actions/patient/settings";
import { PortalSettingsForm } from "@/components/portal/portal-settings-form";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.settings");

  const result = await getPortalSettings();
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="welcome-banner space-y-2 p-5 sm:p-7">
        <p className="text-sm font-medium text-white/80">{t("subtitle")}</p>
        <h1 className="font-headline text-2xl text-white md:text-3xl">{t("title")}</h1>
      </section>
      <PortalSettingsForm
        settings={result.data}
        namespace="patient.settings"
        showPaymentNotify
        showPush
        onSave={updatePortalSettings}
      />
    </div>
  );
}
