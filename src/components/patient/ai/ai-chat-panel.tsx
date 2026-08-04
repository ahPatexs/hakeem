"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveMessage } from "@/actions/patient/ai";
import { AiAssistantShell } from "@/components/platform/ai";
import type { AiMessage } from "@prisma/client";

const SUGGESTED_KEYS = ["symptoms", "medication", "appointment", "records"] as const;

export function AiChatPanel({
  conversationId,
  initialMessages,
  locale,
}: {
  conversationId: string;
  initialMessages: AiMessage[];
  locale: string;
}) {
  const t = useTranslations("patient.ai");
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || pending) return;
    setPending(true);
    setInput("");

    const userMsg = { role: "user" as const, content: text.trim() };
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, conversationId, role: "user", content: text.trim(), createdAt: new Date() },
    ]);

    await saveMessage({ conversationId, role: "user", content: text.trim() });

    try {
      const res = await fetch("/api/patient/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messages: [...messages.map((m) => ({ role: m.role, content: m.content })), userMsg],
          locale: locale === "ar" ? "ar" : "en",
        }),
      });
      const data = (await res.json()) as { content?: string; error?: string };
      const assistantContent = data.content ?? t("error");

      await saveMessage({ conversationId, role: "assistant", content: assistantContent });
      setMessages((prev) => [
        ...prev,
        {
          id: `tmp-a-${Date.now()}`,
          conversationId,
          role: "assistant",
          content: assistantContent,
          createdAt: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `tmp-e-${Date.now()}`,
          conversationId,
          role: "assistant",
          content: t("error"),
          createdAt: new Date(),
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <AiAssistantShell feature="patient" className="flex h-[calc(100vh-12rem)] flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_KEYS.map((key) => (
          <Button key={key} type="button" variant="outline" size="sm" onClick={() => send(t(`suggested.${key}`))}>
            {t(`suggested.${key}`)}
          </Button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-on-surface-variant">{t("emptyChat")}</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "ms-auto bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface"
              }`}
            >
              {m.content}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("inputPlaceholder")}
          disabled={pending}
        />
        <Button type="submit" variant="soft" disabled={pending || !input.trim()}>
          {t("send")}
        </Button>
      </form>
    </AiAssistantShell>
  );
}
