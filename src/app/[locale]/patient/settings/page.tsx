import { setRequestLocale, getTranslations } from "next-intl/server";
import { getPortalSettings } from "@/actions/patient/settings";
import { SettingsForm } from "@/components/patient/settings/settings-form";
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
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
      <SettingsForm settings={result.data} />
    </div>
  );
}
