"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { KpiCard } from "@/components/admin/shared/kpi-card";
import type { OpsDashboard } from "@/lib/ai/ops";
import { UsageCharts } from "./usage-charts";

function periodHref(days: number) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return `/admin/ai?from=${from.toISOString()}&to=${to.toISOString()}`;
}

export function OpsDashboardView({
  data,
  periodDays,
}: {
  data: OpsDashboard;
  periodDays: 7 | 30 | 90;
}) {
  const t = useTranslations("ai.admin");
  const breached = data.cost.budgets.filter((b) => b.breached);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-headline text-xl text-primary">{t("dashboardTitle")}</h2>
          <p className="text-sm text-on-surface-variant">{t("dashboardSubtitle")}</p>
        </div>
        <div className="flex gap-2 text-sm">
          {([7, 30, 90] as const).map((d) => (
            <Link
              key={d}
              href={periodHref(d)}
              className={periodDays === d ? "font-bold text-primary" : "text-med-green"}
            >
              {t(`period.${d}d`)}
            </Link>
          ))}
        </div>
      </div>

      {breached.length > 0 ? (
        <div
          role="alert"
          className="rounded-xl border border-warm-coral/40 bg-warm-coral/10 px-4 py-3 text-sm text-warm-coral"
        >
          <p className="font-medium">{t("budgetBreachTitle")}</p>
          <ul className="mt-1 list-inside list-disc">
            {breached.map((b) => (
              <li key={b.id}>
                {b.scope === "GLOBAL"
                  ? t("budgetGlobal")
                  : t("budgetFeature", { feature: b.feature ?? "" })}
                : {b.utilizationPct.toFixed(0)}% / ${b.monthlyUsd.toFixed(2)}
                {b.hardCap ? ` (${t("hardCapOn")})` : ""}
              </li>
            ))}
          </ul>
          <Link href="/admin/ai/budgets" className="mt-2 inline-block underline">
            {t("manageBudgets")}
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("kpiUsage")} value={data.usage.total} />
        <KpiCard label={t("kpiCost")} value={`$${data.cost.totalUsd.toFixed(4)}`} />
        <KpiCard label={t("kpiLatencyP95")} value={`${data.latency.p95Ms} ms`} />
        <KpiCard
          label={t("kpiErrorRate")}
          value={`${data.errors.errorRate}%`}
          subtext={t("kpiRefusalRate", { rate: data.errors.refusalRate })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label={t("kpiGuardrails")} value={data.guardrails.total} />
        <KpiCard
          label={t("kpiFeedback")}
          value={`${data.feedback.helpfulRatio}%`}
          subtext={t("kpiFeedbackDetail", {
            helpful: data.feedback.helpful,
            notHelpful: data.feedback.notHelpful,
            flagged: data.feedback.flagged,
          })}
        />
        <KpiCard
          label={t("kpiLatencyP50")}
          value={`${data.latency.p50Ms} ms`}
        />
      </div>

      <UsageCharts
        byFeature={data.usage.byFeature}
        byRole={data.usage.byRole}
        byLocale={data.usage.byLocale}
        costByFeature={data.cost.byFeature}
        guardrailsByTrigger={data.guardrails.byTrigger}
      />
    </div>
  );
}
