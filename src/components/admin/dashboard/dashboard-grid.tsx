import { QuickActions } from "@/components/admin/dashboard/quick-actions";
import { KpiCard } from "@/components/admin/shared/kpi-card";
import { ErrorState } from "@/components/platform";
import { HealthStatusPill } from "@/components/admin/shared/status-badge";
import { Link } from "@/i18n/routing";
import { formatSar } from "@/lib/platform/localization";
import type { DashboardSnapshot } from "@/domain/admin/dashboard";
import { getLocale, getTranslations } from "next-intl/server";
import { WelcomeBanner } from "@/components/portal/welcome-banner";

export async function DashboardGrid({ snapshot }: { snapshot: DashboardSnapshot }) {
  const t = await getTranslations("admin.dashboard");
  const locale = ((await getLocale()) === "ar" ? "ar" : "en") as "en" | "ar";

  return (
    <div className="space-y-8">
      <WelcomeBanner title={t("title")} subtitle={t("subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {snapshot.totalPatients.status === "ok" ? (
          <KpiCard label={t("totalPatients")} value={snapshot.totalPatients.data} href="/admin/users" />
        ) : (
          <ErrorState title={t("totalPatients")} message={snapshot.totalPatients.code} />
        )}
        {snapshot.totalDoctors.status === "ok" ? (
          <KpiCard label={t("totalDoctors")} value={snapshot.totalDoctors.data} href="/admin/doctors" />
        ) : (
          <ErrorState title={t("totalDoctors")} message={snapshot.totalDoctors.code} />
        )}
        {snapshot.activeAppointments.status === "ok" ? (
          <KpiCard label={t("activeAppointments")} value={snapshot.activeAppointments.data} href="/admin/appointments" />
        ) : (
          <ErrorState title={t("activeAppointments")} message={snapshot.activeAppointments.code} />
        )}
        {snapshot.pendingDoctorApprovals.status === "ok" ? (
          <KpiCard
            label={t("pendingApprovals")}
            value={snapshot.pendingDoctorApprovals.data}
            href="/admin/doctors?pending=1"
            subtext={t("pendingApprovalsHint")}
          />
        ) : (
          <ErrorState title={t("pendingApprovals")} message={snapshot.pendingDoctorApprovals.code} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:p-6 shadow-sm">
          <h2 className="font-headline text-lg text-primary">{t("revenueSummary")}</h2>
          {snapshot.revenueSummary.status === "ok" ? (
            <div className="mt-4 space-y-2 text-sm">
              <p>
                {t("gross")}: <strong>{formatSar(snapshot.revenueSummary.data.grossCents, locale)}</strong>
              </p>
              <p>
                {t("refunds")}: <strong>{formatSar(snapshot.revenueSummary.data.refundCents, locale)}</strong>
              </p>
              <p>
                {t("net")}: <strong className="text-med-green">{formatSar(snapshot.revenueSummary.data.netCents, locale)}</strong>
              </p>
              <p>
                {t("stuckProcessing")}: <strong>{snapshot.revenueSummary.data.stuckCount}</strong>
              </p>
              <Link href="/admin/revenue" className="text-sm font-medium text-med-green hover:underline">
                {t("viewRevenue")}
              </Link>
            </div>
          ) : (
            <ErrorState title={t("revenueSummary")} message={snapshot.revenueSummary.code} className="mt-4" />
          )}
        </section>

        <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:p-6 shadow-sm">
          <h2 className="font-headline text-lg text-primary">{t("aiUsage")}</h2>
          {snapshot.aiUsage.status === "ok" ? (
            <div className="mt-4 space-y-2 text-sm">
              <p>
                {t("patientMessages")}: <strong>{snapshot.aiUsage.data.patientMessages}</strong>
              </p>
              <p>
                {t("doctorMessages")}: <strong>{snapshot.aiUsage.data.doctorMessages}</strong>
              </p>
              <Link href="/admin/ai" className="text-sm font-medium text-med-green hover:underline">
                {t("viewAiOps")}
              </Link>
            </div>
          ) : (
            <ErrorState title={t("aiUsage")} message={snapshot.aiUsage.code} className="mt-4" />
          )}
        </section>

        <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:p-6 shadow-sm">
          <h2 className="font-headline text-lg text-primary">{t("platformStatus")}</h2>
          {snapshot.platformStatus.status === "ok" ? (
            <div className="mt-4 flex items-center gap-3">
              <HealthStatusPill status={snapshot.platformStatus.data.overall} />
              <Link href="/admin/health" className="text-sm font-medium text-med-green hover:underline">
                {t("viewHealth")}
              </Link>
            </div>
          ) : (
            <ErrorState title={t("platformStatus")} message={snapshot.platformStatus.code} className="mt-4" />
          )}
        </section>

        <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:p-6 shadow-sm">
          <h2 className="font-headline text-lg text-primary">{t("notifications")}</h2>
          {snapshot.unreadNotifications.status === "ok" ? (
            <p className="mt-4 text-sm">
              {t("unreadCount", { count: snapshot.unreadNotifications.data })}{" "}
              <Link href="/admin/notifications" className="font-medium text-med-green hover:underline">
                {t("viewNotifications")}
              </Link>
            </p>
          ) : (
            <ErrorState title={t("notifications")} message={snapshot.unreadNotifications.code} className="mt-4" />
          )}
        </section>
      </div>

      <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-headline text-lg text-primary">{t("recentActivities")}</h2>
          <Link href="/admin/audit" className="text-sm font-medium text-med-green hover:underline">
            {t("viewAudit")}
          </Link>
        </div>
        {snapshot.recentActivities.status === "ok" ? (
          snapshot.recentActivities.data.length ? (
            <ul className="space-y-2 text-sm">
              {snapshot.recentActivities.data.map((ev) => (
                <li key={ev.id} className="flex justify-between gap-4 border-b border-outline-variant/10 py-2">
                  <span className="text-primary">{ev.type}</span>
                  <span className="text-on-surface-variant">{new Date(ev.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-on-surface-variant">{t("noActivities")}</p>
          )
        ) : (
          <ErrorState title={t("recentActivities")} message={snapshot.recentActivities.code} />
        )}
      </section>

      <section>
        <h2 className="mb-3 font-headline text-lg text-primary">{t("quickActionsTitle")}</h2>
        <QuickActions />
      </section>
    </div>
  );
}
