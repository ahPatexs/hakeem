"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function EmergencyBanner({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) {
  const t = useTranslations("ai.chat");
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "rounded-xl border border-error/30 bg-error-container px-4 py-3 text-sm text-error",
        className,
      )}
      data-ai="emergency-banner"
    >
      <p className="font-headline font-medium">{t("emergencyTitle")}</p>
      <p className="mt-1">{text ?? t("emergency")}</p>
    </div>
  );
}
