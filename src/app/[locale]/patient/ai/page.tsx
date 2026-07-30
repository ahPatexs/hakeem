import { setRequestLocale, getTranslations } from "next-intl/server";
import { ensureConversation, listMessages } from "@/actions/patient/ai";
import { AiChatPanel } from "@/components/patient/ai/ai-chat-panel";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function AiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("patient.ai");

  const convResult = await ensureConversation(locale === "ar" ? "AR" : "EN");
  if (!convResult.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  const messagesResult = await listMessages(convResult.data.id);
  if (!messagesResult.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
      <AiChatPanel
        conversationId={convResult.data.id}
        initialMessages={messagesResult.data.messages}
        locale={locale}
      />
    </div>
  );
}
