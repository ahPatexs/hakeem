import { setRequestLocale, getTranslations } from "next-intl/server";
import { aiAdminListModelConfigs } from "@/actions/ai/admin";
import { AiAdminSubnav } from "@/components/ai/admin/ai-admin-subnav";
import { ModelConfigForm } from "@/components/ai/admin/model-config-form";

export default async function AdminAiModelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ai.admin.models");
  const result = await aiAdminListModelConfigs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">{t("pageTitle")}</h1>
        <p className="text-on-surface-variant">{t("pageSubtitle")}</p>
      </div>
      <AiAdminSubnav />
      {!result.ok ? (
        <p className="text-warm-coral">{result.code}</p>
      ) : (
        <ModelConfigForm configs={result.data.items} />
      )}
    </div>
  );
}
