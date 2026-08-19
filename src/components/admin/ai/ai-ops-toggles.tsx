"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toggleAiSetting } from "@/actions/admin/ai-ops";

const TOGGLE_I18N: Record<string, string> = {
  "ai.patientEnabled": "patientEnabled",
  "ai.doctorDocumentationEnabled": "doctorDocumentationEnabled",
  "ai.doctorPrescriptionEnabled": "doctorPrescriptionEnabled",
};

export function AiOpsToggles({ settings }: { settings: Array<{ key: string; value: string }> }) {
  const t = useTranslations("admin.ai");
  const tSettings = useTranslations("admin.settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="glass-card rounded-2xl border border-outline-variant/20 p-5">
      <h2 className="font-headline text-lg text-primary">{t("togglesTitle")}</h2>
      <p className="mt-1 text-sm text-on-surface-variant">{t("togglesHint")}</p>
      <ul className="mt-4 space-y-3">
        {settings.map((s) => {
          const labelKey = TOGGLE_I18N[s.key];
          return (
            <li key={s.key} className="flex items-center justify-between gap-4 text-sm">
              <span>{labelKey ? tSettings(`keys.ai.${labelKey}`) : s.key}</span>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-primary px-3 py-1 text-xs text-on-primary"
                onClick={() =>
                  startTransition(async () => {
                    setError(null);
                    const res = await toggleAiSetting({ key: s.key, enabled: s.value !== "true" });
                    if (!res.ok) {
                      setError(t("actionError"));
                      return;
                    }
                    router.refresh();
                  })
                }
              >
                {s.value === "true" ? t("disable") : t("enable")}
              </button>
            </li>
          );
        })}
      </ul>
      {error ? <p className="mt-3 text-sm text-warm-coral">{error}</p> : null}
    </section>
  );
}
