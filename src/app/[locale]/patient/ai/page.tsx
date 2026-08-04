import { setRequestLocale, getTranslations } from "next-intl/server";
import { AssistantChat } from "@/components/ai/chat/assistant-chat";
import { ErrorState } from "@/components/patient/shared/error-state";
import { aiListConversations, aiGetConversation, aiStartConversation } from "@/actions/ai/conversations";
import type { MessageDto } from "@/lib/ai/conversations";

export default async function AiPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ai.chat");
  const tPatient = await getTranslations("patient.ai");
  const portLocale = locale === "ar" ? "ar" : "en";

  const listResult = await aiListConversations({});
  if (!listResult.ok) {
    return <ErrorState title={tPatient("loadError")} />;
  }

  let conversationId: string | null = listResult.data.items[0]?.id ?? null;
  let initialMessages: MessageDto[] = [];

  if (!conversationId) {
    const started = await aiStartConversation({
      feature: "PATIENT_ASSISTANT",
      locale: portLocale,
    });
    if (!started.ok) {
      return <ErrorState title={tPatient("loadError")} />;
    }
    conversationId = started.data.conversationId;
  } else {
    const detail = await aiGetConversation({ conversationId });
    if (detail.ok) {
      initialMessages = detail.data.messages;
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-headline text-2xl text-primary">{tPatient("title")}</h1>
      <p className="sr-only">{t("disclaimer")}</p>
      <AssistantChat
        locale={locale}
        initialConversationId={conversationId}
        initialMessages={initialMessages}
      />
    </div>
  );
}
