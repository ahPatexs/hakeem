"use client";

import { useTranslations } from "next-intl";
import type { UsageBucket } from "@/lib/ai/ops";
import type { UsageRowDto } from "@/lib/ai/ops";

function formatWhen(value: Date | string) {
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 19).replace("T", " ");
}

function BucketList({
  title,
  items,
  valueLabel,
}: {
  title: string;
  items: Array<{ key: string; count?: number; usd?: number }>;
  valueLabel: (item: { key: string; count?: number; usd?: number }) => string;
}) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-outline-variant/20 p-4">
        <h3 className="font-headline text-base text-primary">{title}</h3>
        <p className="mt-2 text-sm text-on-surface-variant">—</p>
      </div>
    );
  }

  const max = Math.max(
    ...items.map((i) => i.count ?? i.usd ?? 0),
    1,
  );

  return (
    <div className="rounded-xl border border-outline-variant/20 p-4">
      <h3 className="font-headline text-base text-primary">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => {
          const raw = item.count ?? item.usd ?? 0;
          const pct = Math.round((raw / max) * 100);
          return (
            <li key={item.key} className="text-sm">
              <div className="mb-1 flex justify-between gap-2">
                <span className="truncate text-on-surface-variant">{item.key}</span>
                <span className="shrink-0 font-medium text-primary">{valueLabel(item)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full bg-med-green"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function UsageCharts({
  byFeature,
  byRole,
  byLocale,
  costByFeature,
  guardrailsByTrigger,
}: {
  byFeature: UsageBucket[];
  byRole: UsageBucket[];
  byLocale: UsageBucket[];
  costByFeature?: Array<{ key: string; usd: number }>;
  guardrailsByTrigger?: UsageBucket[];
}) {
  const t = useTranslations("ai.admin");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BucketList
        title={t("chartByFeature")}
        items={byFeature}
        valueLabel={(i) => String(i.count ?? 0)}
      />
      <BucketList
        title={t("chartByRole")}
        items={byRole}
        valueLabel={(i) => String(i.count ?? 0)}
      />
      <BucketList
        title={t("chartByLocale")}
        items={byLocale}
        valueLabel={(i) => String(i.count ?? 0)}
      />
      {costByFeature ? (
        <BucketList
          title={t("chartCostByFeature")}
          items={costByFeature.map((c) => ({ key: c.key, usd: c.usd }))}
          valueLabel={(i) => `$${(i.usd ?? 0).toFixed(4)}`}
        />
      ) : null}
      {guardrailsByTrigger ? (
        <BucketList
          title={t("chartGuardrails")}
          items={guardrailsByTrigger}
          valueLabel={(i) => String(i.count ?? 0)}
        />
      ) : null}
    </div>
  );
}

export function UsageTable({
  items,
  total,
  totalCostUsd,
}: {
  items: UsageRowDto[];
  total: number;
  totalCostUsd: number;
}) {
  const t = useTranslations("ai.admin");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant">
        <span>
          {t("usageTotal", { total })}
        </span>
        <span>
          {t("usageTotalCost", { cost: totalCostUsd.toFixed(4) })}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">{t("usageEmpty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant">
              <tr>
                <th className="px-3 py-2 font-medium">{t("colFeature")}</th>
                <th className="px-3 py-2 font-medium">{t("colRole")}</th>
                <th className="px-3 py-2 font-medium">{t("colLocale")}</th>
                <th className="px-3 py-2 font-medium">{t("colOutcome")}</th>
                <th className="px-3 py-2 font-medium">{t("colLatency")}</th>
                <th className="px-3 py-2 font-medium">{t("colTokens")}</th>
                <th className="px-3 py-2 font-medium">{t("colCost")}</th>
                <th className="px-3 py-2 font-medium">{t("colWhen")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-outline-variant/10">
                  <td className="px-3 py-2">{row.feature}</td>
                  <td className="px-3 py-2">{row.role}</td>
                  <td className="px-3 py-2">{row.locale}</td>
                  <td className="px-3 py-2">{row.outcome}</td>
                  <td className="px-3 py-2">{row.latencyMs}</td>
                  <td className="px-3 py-2">
                    {row.promptTokens}/{row.completionTokens}
                  </td>
                  <td className="px-3 py-2">${row.estimatedCostUsd.toFixed(6)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatWhen(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
