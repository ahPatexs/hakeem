import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSystemHealth } from "@/actions/admin/health";
import { HealthStatusPill } from "@/components/admin/shared/status-badge";
import { HealthRefreshButton } from "@/components/admin/health/health-refresh-button";
import { VideoSessionAnalyticsCard } from "@/components/admin/video-session-analytics-card";
import { VideoCallLogCard } from "@/components/admin/video-call-log-card";

export default async function AdminHealthPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.health");
  const result = await getSystemHealth();
  if (!result.ok) return <p className="text-warm-coral">{result.code}</p>;
  const health = result.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
          <p className="text-on-surface-variant">{t("subtitle")}</p>
        </div>
        <HealthRefreshButton />
      </div>
      <div className="flex items-center gap-3">
        <HealthStatusPill status={health.overall} />
        {health.checkedAt ? (
          <span className="text-sm text-on-surface-variant">
            {t("lastChecked")}: {new Date(health.checkedAt).toLocaleString()}
          </span>
        ) : null}
      </div>
      <ul className="space-y-2">
        {health.components.map((c) => (
          <li
            key={c.key}
            className="flex items-center justify-between rounded-xl border border-outline-variant/20 px-4 py-3 text-sm"
          >
            <span className="font-medium text-primary">{c.key}</span>
            <span className={c.ok ? "text-med-green" : "text-warm-coral"}>{c.message}</span>
          </li>
        ))}
      </ul>
      <VideoSessionAnalyticsCard />
      <VideoCallLogCard />
    </div>
  );
}
