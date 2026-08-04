"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function AiDisclaimer({ className }: { className?: string }) {
  const t = useTranslations("ai.chat");
  return (
    <p
      className={cn(
        "rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant",
        className,
      )}
      data-ai="disclaimer"
    >
      {t("disclaimer")}
    </p>
  );
}
