"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocalParticipant, useChat } from "@livekit/components-react";
import { useTranslations } from "next-intl";
import { platformListVisitChat, platformSendVisitChat } from "@/actions/platform/video";
import {
  decodeVisitChatPayload,
  encodeVisitChatPayload,
  normalizeVisitChatBody,
  VISIT_CHAT_MAX_LENGTH,
  type VisitChatRole,
} from "@/domain/platform/video";
import {
  VisitChatBubbles,
  VisitChatComposer,
  VisitChatFrame,
  type ChatMessage,
} from "./visit-chat";
import { VideoDoctorAiAssist } from "./video-doctor-ai-assist";

export function LiveKitVisitChat({
  appointmentId,
  role,
  className,
}: {
  appointmentId: string;
  role: VisitChatRole;
  className?: string;
}) {
  const t = useTranslations("platform.video");
  const { chatMessages, send, isSending } = useChat();
  const { localParticipant } = useLocalParticipant();
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    const result = await platformListVisitChat({ appointmentId });
    if (!result.ok) return;
    setHistory(result.data.messages);
  }, [appointmentId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const liveMessages = useMemo(() => {
    return chatMessages.flatMap((entry) => {
      const decoded = decodeVisitChatPayload(entry.message);
      if (decoded) {
        return [
          {
            id: decoded.id,
            body: decoded.body,
            senderName: decoded.senderName,
            role: decoded.role,
            mine: decoded.role === role || entry.from?.identity === localParticipant.identity,
            createdAt: new Date(entry.timestamp).toISOString(),
          } satisfies ChatMessage,
        ];
      }
      const body = normalizeVisitChatBody(entry.message);
      if (!body) return [];
      const mine = entry.from?.identity === localParticipant.identity;
      return [
        {
          id: entry.id ?? `lk-${entry.timestamp}`,
          body,
          senderName: entry.from?.name ?? (mine ? t("chatYou") : role === "doctor" ? "Patient" : "Doctor"),
          role: mine ? role : role === "doctor" ? "patient" : "doctor",
          mine,
          createdAt: new Date(entry.timestamp).toISOString(),
        } satisfies ChatMessage,
      ];
    });
  }, [chatMessages, localParticipant.identity, role, t]);

  const messages = useMemo(() => {
    const byId = new Map<string, ChatMessage>();
    for (const message of [...history, ...liveMessages]) {
      byId.set(message.id, message);
    }
    return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [history, liveMessages]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const body = normalizeVisitChatBody(draft);
    if (!body || isSending) return;
    setDraft("");
    setError(null);

    const persisted = await platformSendVisitChat({ appointmentId, body });
    const wire = persisted.ok
      ? {
          id: persisted.data.message.id,
          body: persisted.data.message.body,
          senderName: persisted.data.message.senderName,
          role: persisted.data.message.role,
        }
      : {
          id: `local-${Date.now()}`,
          body: body.slice(0, VISIT_CHAT_MAX_LENGTH),
          senderName: localParticipant.name || t("chatYou"),
          role,
        };

    try {
      await send(encodeVisitChatPayload(wire));
      if (persisted.ok) {
        setHistory((previous) => {
          if (previous.some((message) => message.id === persisted.data.message.id)) return previous;
          return [...previous, persisted.data.message];
        });
      } else {
        setError(t("chatSendError"));
      }
    } catch {
      setDraft(body);
      setError(t("chatSendError"));
    }
  }

  return (
    <VisitChatFrame
      className={className}
      error={error}
      composer={
        <VisitChatComposer
          draft={draft}
          setDraft={setDraft}
          sending={isSending}
          onSubmit={(event) => void onSubmit(event)}
        />
      }
    >
      <VideoDoctorAiAssist appointmentId={appointmentId} role={role} />
      <VisitChatBubbles messages={messages} empty={t("chatEmpty")} />
    </VisitChatFrame>
  );
}
