import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getAnalyticsSeries } from "@/actions/admin/ai-ops";
import { KpiCard } from "@/components/admin/shared/kpi-card";

export default async function AdminAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.analytics");
  const period = (sp.period ?? "30d") as "7d" | "30d" | "90d";
  const result = await getAnalyticsSeries({ period });
  if (!result.ok) return <p className="text-warm-coral">{result.code}</p>;
  const d = result.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
          <p className="text-on-surface-variant">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2 text-sm">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <Link
              key={p}
              href={`/admin/analytics?period=${p}`}
              className={period === p ? "font-bold text-primary" : "text-med-green"}
            >
              {t(`period.${p}`)}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label={t("newUsers")} value={d.users} />
        <KpiCard label={t("newDoctors")} value={d.doctors} />
        <KpiCard label={t("appointments")} value={d.appointments} />
        <KpiCard label={t("revenueNet")} value={`${(d.revenueNetCents / 100).toFixed(2)} SAR`} />
        <KpiCard label={t("aiMessages")} value={d.aiMessages} />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/admin/analytics/appointments" className="text-med-green hover:underline">
          {t("appointmentsView")}
        </Link>
        <Link href="/admin/analytics/revenue" className="text-med-green hover:underline">
          {t("revenueView")}
        </Link>
        <Link href="/admin/analytics/ai" className="text-med-green hover:underline">
          {t("aiView")}
        </Link>
        <a href={`/api/admin/exports/analytics?period=${period}`} className="text-med-green hover:underline">
          {t("exportCsv")}
        </a>
      </div>
    </div>
  );
}
