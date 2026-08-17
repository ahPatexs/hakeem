"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { platformListVisitChat, platformSendVisitChat } from "@/actions/platform/video";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VISIT_CHAT_MAX_LENGTH, type VisitChatRole } from "@/domain/platform/video";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  body: string;
  senderName: string;
  role: VisitChatRole;
  mine: boolean;
  createdAt: string;
};

type ListResult = Awaited<ReturnType<typeof platformListVisitChat>>;

function isOkList(result: ListResult): result is Extract<ListResult, { ok: true }> {
  return result.ok;
}

export function VisitChatFrame({
  className,
  children,
  composer,
  error,
}: {
  className?: string;
  children: ReactNode;
  composer: ReactNode;
  error?: string | null;
}) {
  const t = useTranslations("platform.video");
  return (
    <section
      className={cn(
        "flex h-[min(68vh,560px)] min-h-[320px] w-full shrink-0 flex-col overflow-hidden border border-outline-variant/20 bg-white lg:w-80",
        className,
      )}
      aria-label={t("chatTitle")}
    >
      <header className="border-b border-outline-variant/15 px-4 py-3">
        <h3 className="text-sm font-semibold text-primary">{t("chatTitle")}</h3>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3" aria-live="polite">
        {children}
      </div>
      <div className="border-t border-outline-variant/15 p-3">
        {composer}
        {error ? <p className="mt-2 text-xs text-warm-coral">{error}</p> : null}
      </div>
    </section>
  );
}

export function VisitChatBubbles({ messages, empty }: { messages: ChatMessage[]; empty: string }) {
  const t = useTranslations("platform.video");
  const locale = useLocale();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (messages.length === 0) {
    return <p className="px-1 py-8 text-center text-sm text-on-surface-variant">{empty}</p>;
  }

  return (
    <>
      {messages.map((message) => (
        <div key={message.id} className={cn("flex", message.mine ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
              message.mine ? "bg-med-green text-white" : "bg-surface-container-high text-primary",
            )}
          >
            <p className="text-[11px] font-medium opacity-80">
              {message.mine ? t("chatYou") : message.senderName}
            </p>
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
            <p className="mt-1 text-[10px] opacity-70">{time(message.createdAt)}</p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </>
  );
}

export function VisitChatComposer({
  draft,
  setDraft,
  sending,
  onSubmit,
}: {
  draft: string;
  setDraft: (value: string) => void;
  sending: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  const t = useTranslations("platform.video");
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={t("chatPlaceholder")}
        maxLength={VISIT_CHAT_MAX_LENGTH}
        aria-label={t("chatPlaceholder")}
        disabled={sending}
      />
      <Button type="submit" size="icon" disabled={sending || !draft.trim()} aria-label={t("send")}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}

function mergeMessages(incoming: ChatMessage[], previous: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of [...incoming, ...previous]) {
    if (!byId.has(message.id) || !message.id.startsWith("local-")) {
      byId.set(message.id, message);
    }
  }
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function VisitChat({
  appointmentId,
  className,
}: {
  appointmentId: string;
  className?: string;
}) {
  const t = useTranslations("platform.video");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await platformListVisitChat({ appointmentId });
    if (!isOkList(result)) {
      setError(t("chatSendError"));
      return;
    }
    setError(null);
    setMessages((previous) => mergeMessages(result.data.messages, previous));
  }, [appointmentId, t]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 1500);
    return () => window.clearInterval(timer);
  }, [load]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      body: body.slice(0, VISIT_CHAT_MAX_LENGTH),
      senderName: t("chatYou"),
      role: "patient",
      mine: true,
      createdAt: new Date().toISOString(),
    };
    setDraft("");
    setError(null);
    setSending(true);
    setMessages((previous) => mergeMessages([], [...previous, optimistic]));

    const result = await platformSendVisitChat({ appointmentId, body });
    setSending(false);
    if (!result.ok) {
      setMessages((previous) => previous.filter((message) => message.id !== optimistic.id));
      setDraft(body);
      setError(t("chatSendError"));
      return;
    }
    setMessages((previous) =>
      previous.map((message) => (message.id === optimistic.id ? result.data.message : message)),
    );
  }

  return (
    <VisitChatFrame
      className={className}
      error={error}
      composer={
        <VisitChatComposer draft={draft} setDraft={setDraft} sending={sending} onSubmit={(event) => void onSubmit(event)} />
      }
    >
      <VisitChatBubbles messages={messages} empty={t("chatEmpty")} />
    </VisitChatFrame>
  );
}
