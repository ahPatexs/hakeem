"use client";

import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MessageDto, MessageEvidenceDto } from "@/lib/ai/conversations";

export type AiChatErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "BUDGET_EXHAUSTED"
  | "DEPENDENCY_UNAVAILABLE"
  | "INTERNAL_FAILURE"
  | "UNKNOWN";

export type AiChatNotice = {
  kind: "RED_FLAG" | "CONSENT_GENERAL_MODE";
  text: string;
};

export type UseAiChatOptions = {
  conversationId?: string | null;
  locale: "en" | "ar";
  feature?: "PATIENT_ASSISTANT" | "DOCTOR_SOAP" | "DOCTOR_SUMMARY";
  /** Required for doctor features with patient chart context. */
  patientUserId?: string;
  appointmentId?: string;
  onConversationId?: (id: string) => void;
  /** Called when SSE `done` includes explainability evidence (FR-024). */
  onEvidence?: (messageId: string, evidence: MessageEvidenceDto) => void;
};

type DonePayload = {
  messageId: string;
  disclaimerShown: boolean;
  evidence?: MessageEvidenceDto;
};

function mapErrorCode(code: string | undefined): AiChatErrorCode {
  const known: AiChatErrorCode[] = [
    "VALIDATION_ERROR",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "RATE_LIMITED",
    "BUDGET_EXHAUSTED",
    "DEPENDENCY_UNAVAILABLE",
    "INTERNAL_FAILURE",
  ];
  if (code && (known as string[]).includes(code)) return code as AiChatErrorCode;
  return "UNKNOWN";
}

async function consumeSse(
  response: Response,
  handlers: {
    onMeta: (data: { conversationId: string; messageId: string }) => void;
    onToken: (t: string) => void;
    onNotice: (n: AiChatNotice) => void;
    onDone: (data: DonePayload) => void;
    onError: (code: string) => void;
  },
) {
  if (!response.body) {
    handlers.onError("DEPENDENCY_UNAVAILABLE");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const lines = chunk.split("\n");
      let eventName = "message";
      let dataLine = "";
      for (const line of lines) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      let data: unknown;
      try {
        data = JSON.parse(dataLine);
      } catch {
        continue;
      }

      if (eventName === "meta") {
        handlers.onMeta(data as { conversationId: string; messageId: string });
      } else if (eventName === "token") {
        handlers.onToken((data as { t: string }).t);
      } else if (eventName === "notice") {
        handlers.onNotice(data as AiChatNotice);
      } else if (eventName === "done") {
        handlers.onDone(data as DonePayload);
      } else if (eventName === "error") {
        handlers.onError((data as { code: string }).code);
      }
    }
  }
}

type ConversationCache = {
  messages?: MessageDto[];
  [key: string]: unknown;
};

export function useAiChat(opts: UseAiChatOptions) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [notice, setNotice] = useState<AiChatNotice | null>(null);
  const [errorCode, setErrorCode] = useState<AiChatErrorCode | null>(null);
  const conversationIdRef = useRef(opts.conversationId ?? null);
  conversationIdRef.current = opts.conversationId ?? conversationIdRef.current;

  const send = useCallback(
    async (message: string) => {
      if (!message.trim() || pending) return;
      setPending(true);
      setErrorCode(null);
      setNotice(null);
      setStreamingText("");

      let activeConversationId = conversationIdRef.current;
      let accumulated = "";
      let sawDone = false;

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeConversationId ?? undefined,
            feature: opts.feature ?? "PATIENT_ASSISTANT",
            message: message.trim(),
            locale: opts.locale,
            ...(opts.patientUserId ? { patientUserId: opts.patientUserId } : {}),
            ...(opts.appointmentId ? { appointmentId: opts.appointmentId } : {}),
          }),
        });

        if (!res.ok && res.headers.get("content-type")?.includes("application/json")) {
          const body = (await res.json()) as { error?: string };
          setErrorCode(mapErrorCode(body.error));
          return;
        }

        await consumeSse(res, {
          onMeta: (meta) => {
            activeConversationId = meta.conversationId;
            conversationIdRef.current = meta.conversationId;
            opts.onConversationId?.(meta.conversationId);
          },
          onToken: (t) => {
            accumulated += t;
            setStreamingText(accumulated);
          },
          onNotice: (n) => {
            setNotice(n);
            if (n.kind === "RED_FLAG") {
              accumulated = n.text;
              setStreamingText(n.text);
            }
          },
          onDone: (done) => {
            sawDone = true;
            if (done.evidence && activeConversationId) {
              opts.onEvidence?.(done.messageId, done.evidence);
              queryClient.setQueriesData<ConversationCache>(
                { queryKey: ["ai", "conversation", activeConversationId] },
                (old) => {
                  if (!old?.messages) return old;
                  return {
                    ...old,
                    messages: old.messages.map((m) =>
                      m.id === done.messageId
                        ? { ...m, evidence: done.evidence ?? null }
                        : m,
                    ),
                  };
                },
              );
            }
          },
          onError: (code) => {
            setErrorCode(mapErrorCode(code));
          },
        });

        if (sawDone && activeConversationId) {
          void queryClient.invalidateQueries({ queryKey: ["ai", "conversations"] });
          void queryClient.invalidateQueries({
            queryKey: ["ai", "conversation", activeConversationId],
          });
        }
      } catch {
        setErrorCode("UNKNOWN");
      } finally {
        setPending(false);
        setStreamingText("");
      }
    },
    [opts, pending, queryClient],
  );

  return {
    send,
    pending,
    streamingText,
    notice,
    errorCode,
    clearNotice: () => setNotice(null),
    clearError: () => setErrorCode(null),
  };
}
