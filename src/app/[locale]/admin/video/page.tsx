import { setRequestLocale, getTranslations } from "next-intl/server";
import { Video } from "lucide-react";
import { listAdminVideoSessions } from "@/actions/admin/video";
import { platformGetVideoSessionAnalytics } from "@/actions/platform/video";
import { VideoOpsTable } from "@/components/admin/video/video-ops-table";
import { formatPortalDateTime } from "@/lib/datetime";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export default async function AdminVideoOpsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.video");

  const to = new Date();
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [board, analytics] = await Promise.all([
    listAdminVideoSessions(),
    platformGetVideoSessionAnalytics({ from: from.toISOString(), to: to.toISOString() }),
  ]);

  if (!board.ok) {
    return <p className="text-warm-coral">{t("loadError")}</p>;
  }

  const live = board.data.live;
  const recent = board.data.recent;
  const stats = analytics.ok ? analytics.data : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-med-green">{t("eyebrow")}</p>
        <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-on-surface-variant">{t("subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label={t("liveNow")} value={String(live.length)} highlight />
        <Stat label={t("sessions7d")} value={stats ? String(stats.sessionCount) : "—"} />
        <Stat label={t("joins7d")} value={stats ? String(stats.joinedCount) : "—"} />
        <Stat label={t("denials7d")} value={stats ? String(stats.deniedCount) : "—"} />
        <Stat
          label={t("avgDuration")}
          value={stats?.avgDurationSeconds == null ? "—" : formatDuration(stats.avgDurationSeconds)}
        />
      </div>

      <section className={cn(portalCardClass, "p-5 md:p-6")}>
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-med-green/15 text-med-green">
            <Video className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="font-headline text-lg text-primary">{t("liveTitle")}</h2>
            <p className="text-xs text-on-surface-variant">{t("liveHint")}</p>
          </div>
        </div>
        {live.length === 0 ? (
          <p className="rounded-2xl bg-surface-container-low px-4 py-8 text-center text-sm text-on-surface-variant">
            {t("liveEmpty")}
          </p>
        ) : (
            <VideoOpsTable
            rows={live.map((row) => ({
              appointmentId: row.appointmentId,
              patientName: row.patientName,
              doctorName: row.doctorName,
              when: formatPortalDateTime(row.startAt, locale),
              duration: formatDuration(row.durationSeconds),
              stateLabel: t(`state.${row.state}` as never),
            }))}
          />
        )}
      </section>

      <section className={cn(portalCardClass, "p-5 md:p-6")}>
        <h2 className="font-headline text-lg text-primary">{t("recentTitle")}</h2>
        <p className="mt-1 text-xs text-on-surface-variant">{t("recentHint")}</p>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-on-surface-variant">{t("recentEmpty")}</p>
        ) : (
          <div className="mt-4">
            <VideoOpsTable
              rows={recent.map((row) => ({
                appointmentId: row.appointmentId,
                patientName: row.patientName,
                doctorName: row.doctorName,
                when: formatPortalDateTime(row.startAt, locale),
                duration: formatDuration(row.durationSeconds),
                stateLabel: t(`state.${row.state}` as never),
              }))}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(portalCardClass, "p-4", highlight && "border-med-green/30 bg-med-green/8")}>
      <p className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-1 font-headline text-2xl text-primary">{value}</p>
    </div>
  );
}
