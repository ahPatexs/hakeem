"use client";

import { useCallback, useState } from "react";
import {
  aiAnswerSymptomStep,
  aiAttachSessionToBooking,
  aiStartSymptomSession,
} from "@/actions/ai/symptom";
import type { SymptomOutcomeDto } from "@/lib/ai/symptom";

export type SymptomPhase = "intake" | "question" | "outcome";

export type UseSymptomSessionOptions = {
  locale: "en" | "ar";
};

export function useSymptomSession(opts: UseSymptomSessionOptions) {
  const [phase, setPhase] = useState<SymptomPhase>("intake");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SymptomOutcomeDto | null>(null);
  const [pending, setPending] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [attached, setAttached] = useState(false);

  const start = useCallback(
    async (complaint: string) => {
      if (!complaint.trim() || pending) return;
      setPending(true);
      setErrorCode(null);
      try {
        const res = await aiStartSymptomSession({
          locale: opts.locale,
          complaint: complaint.trim(),
        });
        if (!res.ok) {
          setErrorCode(res.code);
          return;
        }
        setSessionId(res.data.sessionId);
        if (res.data.outcome) {
          setOutcome(res.data.outcome);
          setPhase("outcome");
          setCurrentQuestion(null);
        } else if (res.data.nextQuestion) {
          setCurrentQuestion(res.data.nextQuestion);
          setPhase("question");
        }
      } catch {
        setErrorCode("UNKNOWN");
      } finally {
        setPending(false);
      }
    },
    [opts.locale, pending],
  );

  const answer = useCallback(
    async (text: string) => {
      if (!sessionId || !text.trim() || pending) return;
      setPending(true);
      setErrorCode(null);
      try {
        const res = await aiAnswerSymptomStep({
          sessionId,
          answer: text.trim(),
        });
        if (!res.ok) {
          setErrorCode(res.code);
          return;
        }
        if (res.data.outcome) {
          setOutcome(res.data.outcome);
          setPhase("outcome");
          setCurrentQuestion(null);
        } else if (res.data.nextQuestion) {
          setCurrentQuestion(res.data.nextQuestion);
          setPhase("question");
        }
      } catch {
        setErrorCode("UNKNOWN");
      } finally {
        setPending(false);
      }
    },
    [pending, sessionId],
  );

  const attach = useCallback(
    async (appointmentId: string) => {
      if (!sessionId || !appointmentId || pending) return;
      setPending(true);
      setErrorCode(null);
      try {
        const res = await aiAttachSessionToBooking({ sessionId, appointmentId });
        if (!res.ok) {
          setErrorCode(res.code);
          return;
        }
        setAttached(true);
      } catch {
        setErrorCode("UNKNOWN");
      } finally {
        setPending(false);
      }
    },
    [pending, sessionId],
  );

  const reset = useCallback(() => {
    setPhase("intake");
    setSessionId(null);
    setCurrentQuestion(null);
    setOutcome(null);
    setErrorCode(null);
    setAttached(false);
  }, []);

  return {
    phase,
    sessionId,
    currentQuestion,
    outcome,
    pending,
    errorCode,
    attached,
    start,
    answer,
    attach,
    reset,
  };
}
