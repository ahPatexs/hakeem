"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { PlatformSettingValueType } from "@prisma/client";
import { updatePlatformSetting } from "@/actions/admin/ai-ops";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

const KEYS = [
  "maintenanceMode",
  "maintenanceMessage",
  "supportEmail",
  "supportPhone",
  "ai.patientEnabled",
  "ai.doctorDocumentationEnabled",
  "ai.doctorPrescriptionEnabled",
  "billing.consultationFeeCents",
] as const;

export function PlatformSettingsForm({
  settings,
}: {
  settings: Array<{ key: string; value: string; valueType: string }>;
}) {
  const t = useTranslations("admin.settings");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<"saved" | "error" | null>(null);

  const rows = KEYS.map((key) => settings.find((s) => s.key === key) ?? { key, value: "", valueType: "STRING" });

  function save(key: string, value: string, valueType: string) {
    startTransition(async () => {
      const res = await updatePlatformSetting({
        key: key as never,
        value,
        valueType: valueType as PlatformSettingValueType,
      });
      setMessage(res.ok ? "saved" : "error");
      if (res.ok) router.refresh();
    });
  }

  return (
    <section className={cn(portalCardClass, "space-y-4 p-6")}>
      <div>
        <h2 className="font-headline text-lg text-primary">{t("platformTitle")}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{t("platformHint")}</p>
      </div>
      {rows.map((s) => (
        <div key={s.key} className="rounded-2xl border border-outline-variant/20 p-4">
          <p className="text-sm font-semibold text-primary">{t(`keys.${s.key}`)}</p>
          <p className="mt-0.5 text-xs text-on-surface-variant">{t(`hints.${s.key}`)}</p>
          {s.valueType === "BOOLEAN" ? (
            <button
              type="button"
              disabled={pending}
              className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-60"
              onClick={() => save(s.key, s.value === "true" ? "false" : "true", "BOOLEAN")}
            >
              {s.value === "true" ? t("turnOff") : t("turnOn")}
            </button>
          ) : (
            <input
              defaultValue={s.value}
              className="mt-3 h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm"
              onBlur={(e) => {
                if (e.target.value !== s.value) save(s.key, e.target.value, s.valueType);
              }}
            />
          )}
        </div>
      ))}
      {message ? (
        <p className={cn("text-sm", message === "saved" ? "text-med-green" : "text-red-600")}>{t(message)}</p>
      ) : null}
    </section>
  );
}
