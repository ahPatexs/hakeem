"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RecommendationCard } from "@/components/ai/recommendations/recommendation-card";
import type { RecommendationDto } from "@/lib/ai/recommendations";

export function RecommendationsPanel({
  initialItems,
}: {
  initialItems: RecommendationDto[];
}) {
  const t = useTranslations("ai.recommendations");
  const [items, setItems] = useState(initialItems);

  return (
    <section className="space-y-3" data-ai-recommendations>
      <div>
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <p className="text-sm text-on-surface-variant">{t("subtitle")}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <RecommendationCard
                item={item}
                onDismissed={(id) => setItems((prev) => prev.filter((r) => r.id !== id))}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
