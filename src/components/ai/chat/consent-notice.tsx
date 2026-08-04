"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Shown when DATA_SHARING consent is missing/withdrawn (FR-030 general mode /
 * CONSENT_GENERAL_MODE). Links to the existing patient consent flow on medical profile.
 * `ai.consentRequired` remains available for copy linking to consent settings.
 */
export function ConsentNotice({
  className,
  mode = "general",
}: {
  className?: string;
  /** @deprecated Prefer `general` — hard CONSENT_REQUIRED gate is unused (FR-030). */
  mode?: "general" | "required";
}) {
  const t = useTranslations("ai.consent");

  return (
    <aside
      className={cn(
        "rounded-xl border border-outline-variant/30 bg-surface-container-high px-3 py-2.5 text-sm text-on-surface",
        className,
      )}
      role="status"
      aria-live="polite"
      data-ai="consent-notice"
      data-consent-mode={mode}
    >
      <p className="font-medium text-primary">{t("title")}</p>
      <p className="mt-1 text-xs text-on-surface-variant">
        {mode === "required" ? t("requiredBody") : t("generalBody")}
      </p>
      <p className="mt-2">
        <Link
          href="/patient/medical-profile"
          className="text-sm font-medium text-med-green underline-offset-2 hover:underline"
        >
          {t("manageLink")}
        </Link>
      </p>
    </aside>
  );
}
