import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { getEarningsSummary } from "@/actions/doctor/earnings";
import { EarningsSummary, EarningsTable } from "@/components/doctor/earnings/earnings-summary";
import { ErrorState } from "@/components/doctor/shared";

const PERIODS = ["month", "7d", "30d"] as const;

export default async function DoctorEarningsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.earnings");
  const period = PERIODS.includes(sp.period as (typeof PERIODS)[number])
    ? (sp.period as (typeof PERIODS)[number])
    : "month";
  const result = await getEarningsSummary({ period });
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const { summary, items } = result.data;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{t("subtitle")}</p>
        <p className="mt-1 text-xs text-on-surface-variant">{t("viewOnly")}</p>
      </header>
      <div className="flex flex-wrap gap-3 text-sm">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={p === "month" ? "/doctor/earnings" : `/doctor/earnings?period=${p}`}
            className={period === p ? "font-semibold text-primary" : "text-med-green hover:underline"}
          >
            {p === "month" ? t("periodMonth") : p === "7d" ? t("period7d") : t("period30d")}
          </Link>
        ))}
      </div>
      <EarningsSummary
        grossCents={summary.grossCents}
        refundCents={summary.refundCents}
        netCents={summary.netCents}
        visits={summary.visits}
        labels={{
          gross: t("gross"),
          refunds: t("refunds"),
          net: t("net"),
          visits: t("visits"),
        }}
      />
      <EarningsTable
        rows={items}
        empty={t("empty")}
        labels={{
          visit: t("visit"),
          patient: t("patient"),
          gross: t("gross"),
          refunds: t("refunds"),
          net: t("net"),
          status: t("status"),
        }}
      />
    </div>
  );
}
