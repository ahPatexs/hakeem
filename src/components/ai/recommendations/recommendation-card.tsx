"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { aiDismissRecommendation } from "@/actions/ai/recommendations";
import type { RecommendationDto } from "@/lib/ai/recommendations";

export function RecommendationCard({
  item,
  onDismissed,
}: {
  item: RecommendationDto;
  onDismissed?: (id: string) => void;
}) {
  const t = useTranslations("ai.recommendations");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const [gone, setGone] = useState(false);

  if (gone) return null;

  function dismiss() {
    if (pending) return;
    startTransition(async () => {
      setError(false);
      const res = await aiDismissRecommendation({ recommendationId: item.id });
      if (!res.ok) {
        setError(true);
        return;
      }
      setGone(true);
      onDismissed?.(item.id);
    });
  }

  return (
    <article
      className="rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-3"
      data-ai-recommendation
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1.5">
          <h3 className="font-headline text-base text-primary">{item.title}</h3>
          <p className="text-sm text-on-surface-variant">{item.body}</p>
          <p className="text-xs text-on-surface-variant/80" data-ai-recommendation-reason>
            {t("reasonLabel")}: {item.reason}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          disabled={pending}
          className="shrink-0 rounded-md p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-primary disabled:opacity-50"
          aria-label={t("dismiss")}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {t("dismissError")}
        </p>
      ) : null}
    </article>
  );
}
