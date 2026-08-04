"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { sendAiMessage, recordAiDecision } from "@/actions/doctor/ai";
import { AiAssistantShell } from "@/components/platform/ai";
import { Bot, Send } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AiMode = "MEDICAL" | "DOCUMENTATION" | "PRESCRIPTION";

export function AiPanel({
  patientUserId,
  appointmentId,
  onInsert,
  defaultMode = "MEDICAL",
  compact = false,
}: {
  patientUserId?: string;
  appointmentId?: string;
  /** When provided, assistant messages get an explicit Insert action (FR-019). */
  onInsert?: (text: string) => void;
  defaultMode?: AiMode;
  compact?: boolean;
}) {
  const t = useTranslations("doctor.ai");
  const [mode, setMode] = useState<AiMode>(defaultMode);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const modes: { key: AiMode; label: string }[] = [
    { key: "MEDICAL", label: t("modeMedical") },
    { key: "DOCUMENTATION", label: t("modeDocumentation") },
    { key: "PRESCRIPTION", label: t("modePrescription") },
  ];

  function send() {
    const content = input.trim();
    if (!content || pending) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content }]);
    startTransition(async () => {
      const res = await sendAiMessage({ conversationId, mode, patientUserId, appointmentId, content });
      if (!res.ok) {
        setError(res.code === "RATE_LIMITED" ? t("rateLimited") : t("error"));
        return;
      }
      setConversationId(res.data.conversationId);
      setMessages((m) => [
        ...m,
        { id: res.data.message.id, role: "assistant", content: res.data.message.content },
      ]);
    });
  }

  const feature =
    mode === "PRESCRIPTION"
      ? "doctorPrescription"
      : mode === "DOCUMENTATION"
        ? "doctorDocumentation"
        : "doctorDocumentation";

  return (
    <AiAssistantShell feature={feature} className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-med-green" aria-hidden />
        <h3 className="font-headline text-lg text-primary">{t("title")}</h3>
      </div>

      <div className="flex flex-wrap gap-1" role="tablist" aria-label={t("title")}>
        {modes.map((m) => (
          <button
            key={m.key}
            type="button"
            role="tab"
            aria-selected={mode === m.key}
            onClick={() => setMode(m.key)}
            className={
              mode === m.key
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-on-primary"
                : "rounded-full border border-outline-variant/30 px-3 py-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high"
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      <div
        className={`flex-1 space-y-3 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-low p-3 ${compact ? "max-h-72" : "min-h-64"}`}
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t("emptyChat")}</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-2xl bg-primary px-3 py-2 text-sm text-on-primary"
                    : "max-w-[85%] rounded-2xl bg-surface-container-high px-3 py-2 text-sm text-primary"
                }
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.role === "assistant" && onInsert ? (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() => {
                        onInsert(m.content);
                        if (conversationId) {
                          void recordAiDecision({ conversationId, decision: "accept", target: "soap.plan" });
                        }
                      }}
                    >
                      {t("insert")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setMessages((all) => all.filter((x) => x.id !== m.id));
                        if (conversationId) {
                          void recordAiDecision({ conversationId, decision: "discard", target: "soap.plan" });
                        }
                      }}
                    >
                      {t("discard")}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))
        )}
        {pending ? <p className="text-xs text-on-surface-variant">…</p> : null}
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("inputPlaceholder")}
          aria-label={t("inputPlaceholder")}
          className="h-10 flex-1 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm outline-none focus:border-primary"
        />
        <Button type="submit" size="icon" disabled={pending || !input.trim()} aria-label={t("send")}>
          <Send className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Button>
      </form>
    </AiAssistantShell>
  );
}
