"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aiAdminSaveBudget } from "@/actions/ai/admin";
import type { CostBudgetRow } from "@/lib/ai/ops";

const FEATURES = [
  "PATIENT_ASSISTANT",
  "SYMPTOM_CHECKER",
  "RECOMMENDATIONS",
  "DOCTOR_SOAP",
  "DOCTOR_SUMMARY",
  "RX_ASSIST",
  "CDS",
] as const;

export function BudgetForm({ budgets }: { budgets: CostBudgetRow[] }) {
  const t = useTranslations("ai.admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scope, setScope] = useState<"GLOBAL" | "FEATURE">("GLOBAL");
  const [feature, setFeature] = useState<string>(FEATURES[0]);
  const [monthlyUsd, setMonthlyUsd] = useState("100");
  const [alertThreshold, setAlertThreshold] = useState("80");
  const [hardCap, setHardCap] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await aiAdminSaveBudget({
        scope,
        feature: scope === "FEATURE" ? feature : null,
        monthlyUsd: Number(monthlyUsd),
        alertThreshold: Number(alertThreshold),
        hardCap,
      });
      if (!res.ok) {
        setError(t("budgetSaveError"));
        return;
      }
      setMessage(t("budgetSaved"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-xl text-primary">{t("budgetsTitle")}</h2>
        <p className="text-sm text-on-surface-variant">{t("budgetsSubtitle")}</p>
      </div>

      {budgets.length > 0 ? (
        <ul className="space-y-2">
          {budgets.map((b) => (
            <li
              key={b.id}
              className={`rounded-xl border p-3 text-sm ${
                b.breached
                  ? "border-warm-coral/40 bg-warm-coral/10"
                  : "border-outline-variant/20"
              }`}
            >
              <p className="font-medium text-primary">
                {b.scope === "GLOBAL"
                  ? t("budgetGlobal")
                  : t("budgetFeature", { feature: b.feature ?? "" })}
              </p>
              <p className="text-on-surface-variant">
                ${b.spentUsd.toFixed(2)} / ${b.monthlyUsd.toFixed(2)} (
                {b.utilizationPct.toFixed(0)}%) · {t("alertAt")} {b.alertThreshold}%
                {b.hardCap ? ` · ${t("hardCapOn")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-on-surface-variant">{t("budgetsEmpty")}</p>
      )}

      <form
        onSubmit={onSubmit}
        className="max-w-md space-y-4 rounded-xl border border-outline-variant/20 p-4"
      >
        <h3 className="font-headline text-base text-primary">{t("budgetFormTitle")}</h3>

        <div className="space-y-2">
          <Label htmlFor="budget-scope">{t("scope")}</Label>
          <select
            id="budget-scope"
            className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
            value={scope}
            onChange={(e) => setScope(e.target.value as "GLOBAL" | "FEATURE")}
          >
            <option value="GLOBAL">{t("scopeGlobal")}</option>
            <option value="FEATURE">{t("scopeFeature")}</option>
          </select>
        </div>

        {scope === "FEATURE" ? (
          <div className="space-y-2">
            <Label htmlFor="budget-feature">{t("feature")}</Label>
            <select
              id="budget-feature"
              className="w-full rounded-lg border border-outline-variant/30 bg-surface px-3 py-2 text-sm"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
            >
              {FEATURES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="budget-monthly">{t("monthlyUsd")}</Label>
          <Input
            id="budget-monthly"
            type="number"
            min={0}
            step="0.01"
            value={monthlyUsd}
            onChange={(e) => setMonthlyUsd(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget-threshold">{t("alertThreshold")}</Label>
          <Input
            id="budget-threshold"
            type="number"
            min={1}
            max={100}
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(e.target.value)}
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hardCap}
            onChange={(e) => setHardCap(e.target.checked)}
          />
          {t("hardCap")}
        </label>

        {error ? <p className="text-sm text-warm-coral">{error}</p> : null}
        {message ? <p className="text-sm text-med-green">{message}</p> : null}

        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("saveBudget")}
        </Button>
      </form>
    </div>
  );
}
