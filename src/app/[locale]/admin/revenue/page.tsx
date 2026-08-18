import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getRevenueSummary } from "@/actions/admin/revenue";
import { KpiCard } from "@/components/admin/shared/kpi-card";
import { Input } from "@/components/ui/input";
import { formatSar } from "@/lib/platform/localization";

const PERIODS = ["today", "7d", "30d", "custom"] as const;
type Period = (typeof PERIODS)[number];

export default async function AdminRevenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.revenue");
  const period = (PERIODS.includes(sp.period as Period) ? sp.period : "30d") as Period;
  const result = await getRevenueSummary({ period, from: sp.from, to: sp.to });
  if (!result.ok) return <p className="text-warm-coral">{result.code}</p>;
  const { grossCents, refundCents, netCents, failedCount, stuckCount } = result.data;
  const appLocale = locale === "ar" ? "ar" : "en";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
          <p className="text-on-surface-variant">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {(["today", "7d", "30d"] as const).map((p) => (
            <Link
              key={p}
              href={`/admin/revenue?period=${p}`}
              className={period === p ? "font-bold text-primary" : "text-med-green"}
            >
              {t(`period.${p}`)}
            </Link>
          ))}
          <Link
            href="/admin/revenue?period=custom"
            className={period === "custom" ? "font-bold text-primary" : "text-med-green"}
          >
            {t("period.custom")}
          </Link>
        </div>
      </div>
      {period === "custom" ? (
        <form method="get" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="period" value="custom" />
          <Input name="from" type="date" defaultValue={sp.from} aria-label={t("fromDate")} className="max-w-[10rem]" />
          <Input name="to" type="date" defaultValue={sp.to} aria-label={t("toDate")} className="max-w-[10rem]" />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary"
          >
            {t("applyRange")}
          </button>
        </form>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label={t("gross")} value={formatSar(grossCents, appLocale)} />
        <KpiCard label={t("refunds")} value={formatSar(refundCents, appLocale)} />
        <KpiCard label={t("net")} value={formatSar(netCents, appLocale)} />
        <KpiCard label={t("failed")} value={String(failedCount)} />
        <KpiCard label={t("stuck")} value={String(stuckCount)} />
      </div>
    </div>
  );
}
