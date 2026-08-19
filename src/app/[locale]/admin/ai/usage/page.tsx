import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { aiAdminListUsage } from "@/actions/ai/admin";
import { AiAdminSubnav } from "@/components/ai/admin/ai-admin-subnav";
import { UsageCharts, UsageTable } from "@/components/ai/admin/usage-charts";
import { USAGE_PAGE_SIZE } from "@/lib/ai/ops";
import type { AiFeatureKey, LocaleCode } from "@prisma/client";

function defaultPeriod(days = 30) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

export default async function AdminAiUsagePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    feature?: string;
    role?: string;
    localeFilter?: string;
    period?: string;
    page?: string;
  }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("ai.admin");

  const days = sp.period === "7d" ? 7 : sp.period === "90d" ? 90 : 30;
  const { from, to } = defaultPeriod(days);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const result = await aiAdminListUsage({
    from,
    to,
    feature: sp.feature as AiFeatureKey | undefined,
    role: sp.role,
    locale: sp.localeFilter as LocaleCode | undefined,
    page,
  });

  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = {
      period: sp.period ?? "30d",
      feature: sp.feature,
      role: sp.role,
      localeFilter: sp.localeFilter,
      ...overrides,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v);
    }
    const s = p.toString();
    return s ? `/admin/ai/usage?${s}` : "/admin/ai/usage";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl text-primary">{t("usagePageTitle")}</h1>
        <p className="text-on-surface-variant">{t("usagePageSubtitle")}</p>
      </div>
      <AiAdminSubnav />

      <div className="flex flex-wrap gap-2 text-sm">
        {(["7d", "30d", "90d"] as const).map((p) => (
          <Link
            key={p}
            href={qs({ period: p, page: "1" })}
            className={(sp.period ?? "30d") === p ? "font-bold text-primary" : "text-med-green"}
          >
            {t(`period.${p}`)}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={qs({ feature: undefined, page: "1" })} className="text-med-green hover:underline">
          {t("filterAllFeatures")}
        </Link>
        {(
          [
            "PATIENT_ASSISTANT",
            "SYMPTOM_CHECKER",
            "RECOMMENDATIONS",
            "DOCTOR_SOAP",
            "DOCTOR_SUMMARY",
            "RX_ASSIST",
            "CDS",
          ] as const
        ).map((f) => (
          <Link
            key={f}
            href={qs({ feature: f, page: "1" })}
            className={sp.feature === f ? "font-bold text-primary" : "text-med-green hover:underline"}
          >
            {f}
          </Link>
        ))}
      </div>

      {!result.ok ? (
        <p className="text-warm-coral">{result.code}</p>
      ) : (
        <>
          <UsageCharts
            byFeature={result.data.byFeature}
            byRole={result.data.byRole}
            byLocale={result.data.byLocale}
          />
          <UsageTable
            items={result.data.items}
            total={result.data.total}
            totalCostUsd={result.data.totalCostUsd}
          />
          {result.data.total > USAGE_PAGE_SIZE ? (
            <div className="flex gap-3 text-sm">
              {page > 1 ? (
                <Link href={qs({ page: String(page - 1) })} className="text-med-green underline">
                  {t("prevPage")}
                </Link>
              ) : null}
              {page * USAGE_PAGE_SIZE < result.data.total ? (
                <Link href={qs({ page: String(page + 1) })} className="text-med-green underline">
                  {t("nextPage")}
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
