"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { registerPushDevice, revokePushDevice } from "@/actions/platform/push-devices";

/**
 * Registers a deterministic web device token so push readiness can be exercised
 * without a full Web Push subscription stack (FR-007 / US3).
 */
export function PushDeviceRegistration() {
  const t = useTranslations("patient.settings");
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "registered" | "error">("idle");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const key = "hakeem.push.webToken";
    let existing = localStorage.getItem(key);
    if (!existing) {
      existing = `web_${crypto.randomUUID().replace(/-/g, "")}_${Date.now()}`;
      localStorage.setItem(key, existing);
    }
    setToken(existing);
  }, []);

  return (
    <section className="glass-card space-y-3 rounded-2xl border border-outline-variant/20 p-6">
      <h2 className="font-headline text-lg text-primary">{t("pushTitle")}</h2>
      <p className="text-sm text-on-surface-variant">{t("pushHint")}</p>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="soft"
          disabled={pending || !token}
          onClick={() => {
            if (!token) return;
            startTransition(async () => {
              const res = await registerPushDevice({ token, platform: "WEB" });
              setStatus(res.ok ? "registered" : "error");
            });
          }}
        >
          {t("pushRegister")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !token}
          onClick={() => {
            if (!token) return;
            startTransition(async () => {
              const res = await revokePushDevice({ token });
              setStatus(res.ok ? "idle" : "error");
            });
          }}
        >
          {t("pushRevoke")}
        </Button>
      </div>
      {status === "registered" ? (
        <p className="text-sm text-med-green">{t("pushRegistered")}</p>
      ) : null}
      {status === "error" ? <p className="text-sm text-red-600">{t("error")}</p> : null}
    </section>
  );
}
