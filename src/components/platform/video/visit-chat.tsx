"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquare, Send } from "lucide-react";
import { platformListVisitChat, platformSendVisitChat } from "@/actions/platform/video";
import { PersonAvatar } from "@/components/portal/person-avatar";
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

function formatChatTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    numberingSystem: "latn",
  });
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
        "hakeem-visit-chat flex h-[min(68vh,560px)] min-h-[320px] w-full shrink-0 flex-col overflow-hidden bg-[#fbf9f8] lg:w-[22rem]",
        className,
      )}
      aria-label={t("chatTitle")}
    >
      <header className="flex items-center gap-3 bg-primary px-4 py-3.5 text-white">
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-med-green opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-med-green" />
        </span>
        <div className="min-w-0">
          <h3 className="font-headline text-base leading-tight">{t("chatTitle")}</h3>
          <p className="text-[11px] font-medium text-white/70">{t("chatSubtitle")}</p>
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-live="polite">
        {children}
      </div>
      <div className="border-t border-outline-variant/15 bg-white p-3">
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

  if (messages.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 text-center">
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageSquare className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-sm font-medium text-primary">{t("chatEmptyTitle")}</p>
        <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-on-surface-variant">{empty}</p>
      </div>
    );
  }

  return (
    <>
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const grouped = previous?.senderName === message.senderName && previous.mine === message.mine;
        const name = message.mine ? t("chatYou") : message.senderName;
        return (
          <div
            key={message.id}
            className={cn("flex items-end gap-2", message.mine ? "flex-row-reverse" : "flex-row")}
          >
            {grouped ? (
              <span className="h-7 w-7 shrink-0" aria-hidden />
            ) : (
              <PersonAvatar
                name={name}
                size="sm"
                className={cn(
                  "!h-7 !w-7 text-[10px]",
                  message.mine ? "bg-med-green/20 text-med-green" : "bg-primary/10 text-primary",
                )}
              />
            )}
            <div
              className={cn(
                "max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                message.mine
                  ? "rounded-2xl rounded-ee-md bg-med-green text-white"
                  : "rounded-2xl rounded-es-md bg-white text-primary",
              )}
            >
              {grouped ? null : (
                <p className={cn("mb-1 text-[11px] font-semibold", message.mine ? "text-white/80" : "text-primary/70")}>
                  {name}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <p className={cn("mt-1 text-[10px] tabular-nums", message.mine ? "text-white/70" : "text-on-surface-variant")}>
                {formatChatTime(message.createdAt, locale)}
              </p>
            </div>
          </div>
        );
      })}
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
    <form onSubmit={onSubmit} className="flex items-end gap-2">
      <label className="sr-only" htmlFor="visit-chat-input">
        {t("chatPlaceholder")}
      </label>
      <textarea
        id="visit-chat-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
        placeholder={t("chatPlaceholder")}
        maxLength={VISIT_CHAT_MAX_LENGTH}
        rows={1}
        disabled={sending}
        className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-outline-variant/30 bg-[#fbf9f8] px-4 py-2.5 text-sm text-primary outline-none placeholder:text-on-surface-variant focus:border-med-green/50 focus:ring-2 focus:ring-med-green/20 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={sending || !draft.trim()}
        aria-label={t("send")}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-med-green text-white shadow-sm transition hover:bg-med-green/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Send className="h-4 w-4 rtl:rotate-180" aria-hidden />
      </button>
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
        <VisitChatComposer
          draft={draft}
          setDraft={setDraft}
          sending={sending}
          onSubmit={(event) => void onSubmit(event)}
        />
      }
    >
      <VisitChatBubbles messages={messages} empty={t("chatEmpty")} />
    </VisitChatFrame>
  );
}
