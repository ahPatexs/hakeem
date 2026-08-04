"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aiAdminSaveModelConfig } from "@/actions/ai/admin";
import type { ModelConfigDto } from "@/lib/ai/models";

const FEATURES = [
  "PATIENT_ASSISTANT",
  "SYMPTOM_CHECKER",
  "RECOMMENDATIONS",
  "DOCTOR_SOAP",
  "DOCTOR_SUMMARY",
  "RX_ASSIST",
  "CDS",
] as const;

export function ModelConfigForm({ configs }: { configs: ModelConfigDto[] }) {
  const t = useTranslations("ai.admin.models");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const activeByFeature = FEATURES.map((feature) => {
    const active = configs.find((c) => c.feature === feature && c.active);
    return { feature, active };
  });

  const [feature, setFeature] = useState<(typeof FEATURES)[number]>(FEATURES[0]);
  const current = configs.find((c) => c.feature === feature && c.active);

  const [provider, setProvider] = useState<"OPENAI" | "STUB">(current?.provider ?? "STUB");
  const [modelName, setModelName] = useState(current?.modelName ?? "stub");
  const [fallbackModel, setFallbackModel] = useState(current?.fallbackModel ?? "");
  const [temperature, setTemperature] = useState(String(current?.temperature ?? 0.3));
  const [maxOutputTokens, setMaxOutputTokens] = useState(
    String(current?.maxOutputTokens ?? 1024),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFeatureChange(next: (typeof FEATURES)[number]) {
    setFeature(next);
    const row = configs.find((c) => c.feature === next && c.active);
    setProvider(row?.provider ?? "STUB");
    setModelName(row?.modelName ?? "stub");
    setFallbackModel(row?.fallbackModel ?? "");
    setTemperature(String(row?.temperature ?? 0.3));
    setMaxOutputTokens(String(row?.maxOutputTokens ?? 1024));
    setMessage(null);
    setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await aiAdminSaveModelConfig({
        feature,
        provider,
        modelName,
        fallbackModel: fallbackModel.trim() || null,
        temperature: Number(temperature),
        maxOutputTokens: Number(maxOutputTokens),
      });
      if (!res.ok) {
        setError(t("saveError"));
        return;
      }
      setMessage(t("saved", { version: res.data.version }));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-xl text-primary">{t("activeTitle")}</h2>
        <p className="text-sm text-on-surface-variant">{t("activeSubtitle")}</p>
      </div>

      {activeByFeature.some((r) => r.active) ? (
        <ul className="space-y-2">
          {activeByFeature
            .filter((r) => r.active)
            .map(({ feature: f, active }) => (
              <li
                key={f}
                className="rounded-xl border border-outline-variant/20 p-3 text-sm"
              >
                <p className="font-medium text-primary">{f}</p>
                <p className="text-on-surface-variant">
                  {active!.provider} · {active!.modelName}
                  {active!.fallbackModel ? ` → ${active!.fallbackModel}` : ""} · v
                  {active!.version} · temp {active!.temperature} · max{" "}
                  {active!.maxOutputTokens}
                </p>
              </li>
            ))}
        </ul>
      ) : (
        <p className="text-sm text-on-surface-variant">{t("empty")}</p>
      )}

      <form
        onSubmit={onSubmit}
        className="max-w-md space-y-4 rounded-xl border border-outline-variant/20 p-4"
      >
        <h3 className="font-headline text-base text-primary">{t("formTitle")}</h3>

        <div className="space-y-2">
          <Label htmlFor="model-feature">{t("feature")}</Label>
          <select
            id="model-feature"
            className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
            value={feature}
            onChange={(e) => onFeatureChange(e.target.value as (typeof FEATURES)[number])}
          >
            {FEATURES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model-provider">{t("provider")}</Label>
          <select
            id="model-provider"
            className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
            value={provider}
            onChange={(e) => setProvider(e.target.value as "OPENAI" | "STUB")}
          >
            <option value="STUB">STUB</option>
            <option value="OPENAI">OPENAI</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model-name">{t("modelName")}</Label>
          <Input
            id="model-name"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model-fallback">{t("fallbackModel")}</Label>
          <Input
            id="model-fallback"
            value={fallbackModel}
            onChange={(e) => setFallbackModel(e.target.value)}
            placeholder={t("fallbackPlaceholder")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model-temp">{t("temperature")}</Label>
          <Input
            id="model-temp"
            type="number"
            min={0}
            max={2}
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model-max-tokens">{t("maxOutputTokens")}</Label>
          <Input
            id="model-max-tokens"
            type="number"
            min={1}
            value={maxOutputTokens}
            onChange={(e) => setMaxOutputTokens(e.target.value)}
            required
          />
        </div>

        {error ? <p className="text-sm text-warm-coral">{error}</p> : null}
        {message ? <p className="text-sm text-med-green">{message}</p> : null}

        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
      </form>
    </div>
  );
}
