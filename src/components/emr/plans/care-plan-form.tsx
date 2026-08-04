"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emrPublishPlan, emrUpsertPlan } from "@/actions/emr/plans";

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Client form to draft and publish a care plan with goals/interventions (T147). */
export function CarePlanForm({ patientUserId }: { patientUserId: string }) {
  const t = useTranslations("emr");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("CARE");
  const [goals, setGoals] = useState("");
  const [interventions, setInterventions] = useState("");
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await emrUpsertPlan({
        patientUserId,
        id: planId,
        title: title.trim(),
        kind: kind.trim() || "CARE",
        goals: linesToList(goals),
        interventions: linesToList(interventions),
      });
      if (!res.ok) {
        setError(t("error"));
        return;
      }
      setPlanId(res.data.id);
      router.refresh();
    });
  }

  function publish() {
    if (!planId) return;
    setError(null);
    startTransition(async () => {
      const res = await emrPublishPlan({ patientUserId, planId });
      if (!res.ok) {
        setError(t("error"));
        return;
      }
      setTitle("");
      setKind("CARE");
      setGoals("");
      setInterventions("");
      setPlanId(undefined);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
      <h3 className="font-headline text-sm text-primary">{t("plans.add")}</h3>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-on-surface-variant">{t("plans.titleField")}</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-on-surface-variant">{t("plans.kind")}</span>
          <Input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="CARE" />
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-on-surface-variant">{t("plans.goals")}</span>
        <textarea
          rows={3}
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          placeholder={t("plans.goalsHint")}
          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-on-surface-variant">{t("plans.interventions")}</span>
        <textarea
          rows={3}
          value={interventions}
          onChange={(e) => setInterventions(e.target.value)}
          placeholder={t("plans.interventionsHint")}
          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={pending || !title.trim()} onClick={save}>
          {pending ? t("loading") : t("plans.saveDraft")}
        </Button>
        <Button type="button" size="sm" disabled={pending || !planId} onClick={publish}>
          {t("plans.publish")}
        </Button>
      </div>
    </div>
  );
}
