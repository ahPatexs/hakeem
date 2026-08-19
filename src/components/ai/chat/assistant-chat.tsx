"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AiDisclaimer } from "@/components/ai/chat/disclaimer";
import { ConsentNotice } from "@/components/ai/chat/consent-notice";
import { EmergencyBanner } from "@/components/ai/chat/emergency-banner";
import { MessageBubble } from "@/components/ai/chat/message-bubble";
import { ConversationList } from "@/components/ai/chat/conversation-list";
import { useAiChat } from "@/hooks/ai/use-ai-chat";
import {
  useAiConversation,
  useAiConversationMutations,
  useAiConversations,
} from "@/hooks/ai/use-ai-conversations";
import type { MessageDto } from "@/lib/ai/conversations";
import { cn } from "@/lib/utils";

const SUGGESTED_KEYS = ["symptoms", "medication", "appointment", "records"] as const;

function errorMessage(
  t: ReturnType<typeof useTranslations>,
  code: string | null,
): string | null {
  if (!code) return null;
  if (code === "RATE_LIMITED") return t("rateLimited");
  if (code === "BUDGET_EXHAUSTED" || code === "DEPENDENCY_UNAVAILABLE") {
    return t("unavailable");
  }
  return t("error");
}

export function AssistantChat({
  locale,
  initialConversationId,
  initialMessages = [],
  className,
}: {
  locale: string;
  initialConversationId?: string | null;
  initialMessages?: MessageDto[];
  className?: string;
}) {
  const t = useTranslations("ai.chat");
  const tRoot = useTranslations("ai");
  const portLocale = locale === "ar" ? "ar" : "en";

  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null,
  );
  const [localMessages, setLocalMessages] = useState<MessageDto[]>(initialMessages);
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const listQuery = useAiConversations();
  const detailQuery = useAiConversation({ conversationId });
  const mutations = useAiConversationMutations();

  const chat = useAiChat({
    conversationId,
    locale: portLocale,
    feature: "PATIENT_ASSISTANT",
    onConversationId: setConversationId,
    onEvidence: (messageId, evidence) => {
      setLocalMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === messageId);
        if (idx >= 0) {
          return prev.map((m) => (m.id === messageId ? { ...m, evidence } : m));
        }
        // After stream, messages may not yet include the assistant row — attach on next refetch
        return prev;
      });
    },
  });

  useEffect(() => {
    if (detailQuery.data?.messages) {
      setLocalMessages(detailQuery.data.messages);
    }
  }, [detailQuery.data?.messages]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const distance = thread.scrollHeight - thread.scrollTop - thread.clientHeight;
    if (distance < 96) {
      thread.scrollTop = thread.scrollHeight;
    }
  }, [localMessages, chat.streamingText, chat.notice]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || chat.pending) return;
    setInput("");

    const userDto: MessageDto = {
      id: `tmp-u-${Date.now()}`,
      role: "USER",
      content: trimmed,
      redFlagged: false,
      disclaimerShown: false,
      createdAt: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userDto]);
    await chat.send(trimmed);
  }

  const displayMessages = localMessages;
  const err = errorMessage(tRoot, chat.errorCode);

  return (
    <div className={cn("flex flex-col gap-4 md:flex-row", className)}>
      <ConversationList
        items={listQuery.data?.items ?? []}
        activeId={conversationId}
        onSelect={(id) => {
          setConversationId(id);
          chat.clearNotice();
          chat.clearError();
        }}
        onNew={async () => {
          const created = await mutations.start.mutateAsync({ locale: portLocale });
          setConversationId(created.conversationId);
          setLocalMessages([]);
          chat.clearNotice();
        }}
        onRename={async (id, title) => {
          await mutations.rename.mutateAsync({ conversationId: id, title });
        }}
        onHide={async (id) => {
          await mutations.hide.mutateAsync({ conversationId: id });
          if (conversationId === id) {
            setConversationId(null);
            setLocalMessages([]);
          }
        }}
      />

      <section className="flex min-h-[calc(100vh-12rem)] flex-1 flex-col gap-3">
        <AiDisclaimer />

        {chat.notice?.kind === "CONSENT_GENERAL_MODE" ? (
          <ConsentNotice mode="general" />
        ) : null}

        {chat.notice?.kind === "RED_FLAG" ? (
          <EmergencyBanner text={chat.notice.text} />
        ) : null}

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t("suggestedLabel")}
        >
          {SUGGESTED_KEYS.map((key) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              size="sm"
              disabled={chat.pending}
              onClick={() => void send(t(`suggested.${key}`))}
            >
              {t(`suggested.${key}`)}
            </Button>
          ))}
        </div>

        <div
          ref={threadRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-low p-4 [overflow-anchor:none]"
          aria-live="polite"
          aria-relevant="additions"
        >
          {displayMessages.length === 0 && !chat.streamingText ? (
            <p className="text-center text-sm text-on-surface-variant">{t("empty")}</p>
          ) : (
            displayMessages.map((m) => <MessageBubble key={m.id} message={m} />)
          )}
          {chat.pending && chat.streamingText && chat.notice?.kind !== "RED_FLAG" ? (
            <MessageBubble
              message={{ role: "ASSISTANT", content: chat.streamingText, redFlagged: false }}
            />
          ) : null}
          {chat.pending && !chat.streamingText && !chat.notice ? (
            <p className="text-sm text-on-surface-variant">{tRoot("loading")}</p>
          ) : null}
        </div>

        {err ? (
          <p className="text-sm text-error" role="status">
            {err}
          </p>
        ) : null}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("inputPlaceholder")}
            disabled={chat.pending}
            aria-label={t("inputPlaceholder")}
          />
          <Button type="submit" variant="soft" disabled={chat.pending || !input.trim()}>
            {t("send")}
          </Button>
        </form>
      </section>
    </div>
  );
}
