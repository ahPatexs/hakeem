import { setRequestLocale, getTranslations } from "next-intl/server";
import { aiAdminListPromptTemplates } from "@/actions/ai/admin";
import { AiAdminSubnav } from "@/components/ai/admin/ai-admin-subnav";
import { PromptEditor } from "@/components/ai/admin/prompt-editor";
import { composeSafetyLayer } from "@/lib/ai/prompts";

export default async function AdminAiPromptsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ai.admin.prompts");
  const result = await aiAdminListPromptTemplates();

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
        <PromptEditor
          templates={result.data.items}
          safetyLayerEn={composeSafetyLayer("en")}
        />
      )}
    </div>
  );
}
