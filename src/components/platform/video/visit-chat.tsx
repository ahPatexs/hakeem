"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Lock, MessageSquare, Send } from "lucide-react";
import { platformListVisitChat, platformSendVisitChat } from "@/actions/platform/video";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { VISIT_CHAT_MAX_LENGTH, type VisitChatRole } from "@/domain/platform/video";
import { cn } from "@/lib/utils";
import { VideoDoctorAiAssist } from "./video-doctor-ai-assist";

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
        "hakeem-visit-chat flex h-[min(68vh,560px)] min-h-[320px] w-full shrink-0 flex-col overflow-hidden border-outline-variant/15 bg-[#fbf9f8] lg:w-[24rem] lg:border-s lg:shadow-[-12px_0_32px_rgba(0,67,111,0.08)]",
        className,
      )}
      aria-label={t("chatTitle")}
    >
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-[#00436f] to-[#003556] px-4 py-3.5 text-white shadow-[0_4px_16px_rgba(0,67,111,0.2)]">
        <div className="pointer-events-none absolute -end-8 -top-10 h-28 w-28 rounded-full bg-white/[0.06]" aria-hidden />
        <div className="pointer-events-none absolute -bottom-6 start-1/3 h-16 w-16 rounded-full bg-med-green/10" aria-hidden />
        <div className="relative flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
            <MessageSquare className="h-4.5 w-4.5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-headline text-[15px] leading-tight tracking-tight">{t("chatTitle")}</h3>
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-med-green opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-med-green shadow-[0_0_8px_rgba(0,168,132,0.6)]" />
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-white/65">
              <Lock className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
              {t("chatSubtitle")}
            </p>
          </div>
        </div>
      </header>
      <div className="visit-chat-thread min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4" aria-live="polite">
        {children}
      </div>
      <div className="border-t border-outline-variant/10 bg-white/90 p-3 backdrop-blur-sm">
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
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full min-h-[14rem] flex-col items-center justify-center px-5 text-center">
        <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/12 to-med-green/10 text-primary ring-1 ring-primary/10">
          <MessageSquare className="h-6 w-6" aria-hidden />
        </span>
        <p className="font-headline text-sm text-primary">{t("chatEmptyTitle")}</p>
        <p className="mt-2 max-w-[15rem] text-xs leading-relaxed text-on-surface-variant">{empty}</p>
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
            className={cn(
              "visit-chat-bubble flex items-end gap-2",
              grouped ? "mt-0.5" : "mt-3 first:mt-0",
              message.mine ? "flex-row-reverse" : "flex-row",
            )}
          >
            {grouped ? (
              <span className="h-8 w-8 shrink-0" aria-hidden />
            ) : (
              <PersonAvatar
                name={name}
                size="sm"
                className={cn(
                  "!h-8 !w-8 text-[10px] ring-2 ring-[#fbf9f8]",
                  message.mine ? "bg-med-green/15 text-med-green" : "bg-primary/10 text-primary",
                )}
              />
            )}
            <div
              className={cn(
                "max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed",
                message.mine
                  ? "rounded-[1.125rem] rounded-ee-md bg-gradient-to-br from-med-green to-[#009a7a] text-white shadow-[0_4px_14px_rgba(0,168,132,0.28)]"
                  : "rounded-[1.125rem] rounded-es-md bg-white text-primary shadow-[0_2px_8px_rgba(0,67,111,0.07)] ring-1 ring-outline-variant/12",
              )}
            >
              {grouped ? null : (
                <p
                  className={cn(
                    "mb-1 text-[11px] font-semibold tracking-wide",
                    message.mine ? "text-white/85" : "text-primary/75",
                  )}
                >
                  {name}
                </p>
              )}
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <p
                className={cn(
                  "mt-1.5 text-[10px] tabular-nums",
                  message.mine ? "text-white/65" : "text-on-surface-variant/80",
                )}
              >
                {formatChatTime(message.createdAt, locale)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} className="h-px shrink-0" aria-hidden />
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
  const remaining = VISIT_CHAT_MAX_LENGTH - draft.length;
  const showCounter = draft.length > VISIT_CHAT_MAX_LENGTH * 0.75;

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex items-end gap-2 rounded-2xl border border-outline-variant/20 bg-[#fbf9f8] p-1.5 shadow-inner focus-within:border-med-green/40 focus-within:ring-2 focus-within:ring-med-green/15">
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
          className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-primary outline-none placeholder:text-on-surface-variant/70 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label={t("send")}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-med-green text-white shadow-[0_2px_8px_rgba(0,168,132,0.35)] transition hover:bg-[#009a7a] hover:shadow-[0_4px_12px_rgba(0,168,132,0.4)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <Send className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[10px] text-on-surface-variant/70">{t("chatComposerHint")}</p>
        {showCounter ? (
          <p
            className={cn(
              "text-[10px] tabular-nums",
              remaining < 50 ? "font-medium text-warm-coral" : "text-on-surface-variant/60",
            )}
            aria-live="polite"
          >
            {remaining}
          </p>
        ) : null}
      </div>
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
  role,
  className,
}: {
  appointmentId: string;
  role: VisitChatRole;
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
      <VideoDoctorAiAssist appointmentId={appointmentId} role={role} />
      <VisitChatBubbles messages={messages} empty={t("chatEmpty")} />
    </VisitChatFrame>
  );
}
