"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toggleAiSetting } from "@/actions/admin/ai-ops";

export function AiOpsToggles({ settings }: { settings: Array<{ key: string; value: string }> }) {
  const t = useTranslations("admin.ai");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <section className="glass-card rounded-2xl border border-outline-variant/20 p-5">
      <h2 className="font-headline text-lg text-primary">{t("togglesTitle")}</h2>
      <ul className="mt-4 space-y-3">
        {settings.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-4 text-sm">
            <span>{s.key}</span>
            <button
              type="button"
              disabled={pending}
              className="rounded-lg bg-primary px-3 py-1 text-xs text-on-primary"
              onClick={() =>
                startTransition(async () => {
                  await toggleAiSetting({ key: s.key, enabled: s.value !== "true" });
                  router.refresh();
                })
              }
            >
              {s.value === "true" ? t("disable") : t("enable")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
