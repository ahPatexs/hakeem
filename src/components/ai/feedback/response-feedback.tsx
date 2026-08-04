"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { aiSubmitFeedback } from "@/actions/ai/feedback";
import { cn } from "@/lib/utils";
import { Flag, ThumbsDown, ThumbsUp } from "lucide-react";

type Rating = "HELPFUL" | "NOT_HELPFUL" | "FLAGGED";

export function ResponseFeedback({
  messageId,
  draftId,
  className,
}: {
  messageId?: string;
  draftId?: string;
  className?: string;
}) {
  const t = useTranslations("ai.feedback");
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Rating | null>(null);
  const [error, setError] = useState(false);

  if (!messageId && !draftId) return null;
  // Skip temporary client-side message ids
  if (messageId?.startsWith("tmp-")) return null;

  function submit(rating: Rating) {
    if (pending) return;
    setError(false);
    startTransition(async () => {
      const res = await aiSubmitFeedback({
        messageId,
        draftId,
        rating,
        category: rating === "FLAGGED" ? "user_report" : undefined,
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setSelected(rating);
    });
  }

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1 pt-1", className)}
      role="group"
      aria-label={t("label")}
      data-ai="response-feedback"
    >
      <span className="me-1 text-xs text-on-surface-variant">{t("prompt")}</span>
      <Button
        type="button"
        size="sm"
        variant={selected === "HELPFUL" ? "soft" : "ghost"}
        disabled={pending}
        aria-pressed={selected === "HELPFUL"}
        aria-label={t("helpful")}
        onClick={() => submit("HELPFUL")}
      >
        <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={selected === "NOT_HELPFUL" ? "soft" : "ghost"}
        disabled={pending}
        aria-pressed={selected === "NOT_HELPFUL"}
        aria-label={t("notHelpful")}
        onClick={() => submit("NOT_HELPFUL")}
      >
        <ThumbsDown className="h-3.5 w-3.5" aria-hidden />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={selected === "FLAGGED" ? "soft" : "ghost"}
        disabled={pending}
        aria-pressed={selected === "FLAGGED"}
        aria-label={t("flag")}
        onClick={() => submit("FLAGGED")}
      >
        <Flag className="h-3.5 w-3.5" aria-hidden />
      </Button>
      {selected ? (
        <span className="text-xs text-on-surface-variant" role="status">
          {t("thanks")}
        </span>
      ) : null}
      {error ? (
        <span className="text-xs text-error" role="alert">
          {t("error")}
        </span>
      ) : null}
    </div>
  );
}
