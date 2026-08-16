import { setRequestLocale, getTranslations } from "next-intl/server";
import { getPlatformSettings } from "@/actions/admin/ai-ops";
import { getAdminPortalSettings, updateAdminPortalSettings } from "@/actions/admin/preferences";
import { PortalSettingsForm } from "@/components/portal/portal-settings-form";
import { PlatformSettingsForm } from "@/components/admin/settings/platform-settings-form";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function AdminSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.settings");

  const [prefs, platform] = await Promise.all([getAdminPortalSettings(), getPlatformSettings()]);
  if (!prefs.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }
  if (!platform.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="welcome-banner space-y-2 p-5 sm:p-7">
        <p className="text-sm font-medium text-white/80">{t("subtitle")}</p>
        <h1 className="font-headline text-2xl text-white md:text-3xl">{t("title")}</h1>
      </section>
      <PortalSettingsForm
        settings={prefs.data}
        namespace="admin.settings"
        onSave={updateAdminPortalSettings}
      />
      <PlatformSettingsForm settings={platform.data} />
    </div>
  );
}
