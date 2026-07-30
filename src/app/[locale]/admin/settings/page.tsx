import { setRequestLocale, getTranslations } from "next-intl/server";
import { getPlatformSettings } from "@/actions/admin/settings";
import { SettingsForm } from "@/components/admin/settings/settings-form";

export default async function AdminSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.settings");
  const result = await getPlatformSettings();
  if (!result.ok) return <p className="text-warm-coral">{result.code}</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
        <p className="text-on-surface-variant">{t("subtitle")}</p>
      </div>
      <SettingsForm settings={result.data} />
    </div>
  );
}
