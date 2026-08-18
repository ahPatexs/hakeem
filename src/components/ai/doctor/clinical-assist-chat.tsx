"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageBubble } from "@/components/ai/chat/message-bubble";
import { useAiChat } from "@/hooks/ai/use-ai-chat";
import type { MessageDto } from "@/lib/ai/conversations";
import { cn } from "@/lib/utils";
import { Send } from "lucide-react";

function errorMessage(
  t: ReturnType<typeof useTranslations>,
  tRoot: ReturnType<typeof useTranslations>,
  code: string | null,
): string | null {
  if (!code) return null;
  if (code === "RATE_LIMITED") return t("rateLimited");
  if (code === "BUDGET_EXHAUSTED" || code === "DEPENDENCY_UNAVAILABLE") {
    return tRoot("unavailable");
  }
  return t("error");
}

/**
 * Doctor clinical Q&A via Module 7 `/api/ai/chat` (feature DOCTOR_SOAP).
 * Same SSE contract as patient AssistantChat; scoped to a care-relationship patient.
 */
export function ClinicalAssistChat({
  patientUserId,
  appointmentId,
  onInsert,
  compact = false,
  className,
}: {
  patientUserId: string;
  appointmentId?: string;
  onInsert?: (text: string) => void;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("doctor.ai");
  const tRoot = useTranslations("ai");
  const locale = useLocale();
  const portLocale = locale === "ar" ? "ar" : "en";

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<MessageDto[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamSnapshot = useRef("");
  const prevPending = useRef(false);

  const chat = useAiChat({
    conversationId,
    locale: portLocale,
    feature: "DOCTOR_SOAP",
    patientUserId,
    appointmentId,
    onConversationId: setConversationId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, chat.streamingText]);

  useEffect(() => {
    if (chat.streamingText) streamSnapshot.current = chat.streamingText;
    if (prevPending.current && !chat.pending && streamSnapshot.current) {
      const content = streamSnapshot.current;
      streamSnapshot.current = "";
      setLocalMessages((prev) => [
        ...prev,
        {
          id: `tmp-a-${Date.now()}`,
          role: "ASSISTANT",
          content,
          redFlagged: chat.notice?.kind === "RED_FLAG",
          disclaimerShown: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    prevPending.current = chat.pending;
  }, [chat.pending, chat.streamingText, chat.notice?.kind]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || chat.pending) return;
    setInput("");

    setLocalMessages((prev) => [
      ...prev,
      {
        id: `tmp-u-${Date.now()}`,
        role: "USER",
        content: trimmed,
        redFlagged: false,
        disclaimerShown: false,
        createdAt: new Date().toISOString(),
      },
    ]);

    await chat.send(trimmed);
  }

  const err = errorMessage(t, tRoot, chat.errorCode);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        className={cn(
          "flex-1 space-y-3 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-low p-3",
          compact ? "max-h-72" : "min-h-64",
        )}
        aria-live="polite"
      >
        {localMessages.length === 0 && !chat.streamingText ? (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">{t("emptyChat")}</p>
            <div className="flex flex-wrap gap-2">
              {[t("suggestSymptoms"), t("suggestMeds"), t("suggestFollowup")].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={chat.pending}
                  onClick={() => void send(prompt)}
                  className="rounded-full border border-outline-variant/30 px-3 py-1.5 text-start text-xs font-semibold text-primary hover:bg-surface-container-high"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          localMessages.map((m) => (
            <div key={m.id} className="space-y-1">
              <MessageBubble message={m} />
              {m.role === "ASSISTANT" && onInsert ? (
                <div className="flex gap-2 ps-1">
                  <Button size="sm" variant="soft" onClick={() => onInsert(m.content)}>
                    {t("insert")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setLocalMessages((all) => all.filter((x) => x.id !== m.id))}
                  >
                    {t("discard")}
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
        {chat.pending && chat.streamingText ? (
          <MessageBubble
            message={{ role: "ASSISTANT", content: chat.streamingText, redFlagged: false }}
          />
        ) : null}
        {chat.pending && !chat.streamingText ? (
          <p className="text-xs text-on-surface-variant">{tRoot("loading")}</p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {err ? (
        <p className="text-sm text-red-600" role="alert">
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
          className="h-10 flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={chat.pending || !input.trim()}
          aria-label={t("send")}
        >
          <Send className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Button>
      </form>
    </div>
  );
}
