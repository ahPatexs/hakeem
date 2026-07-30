import { Link } from "@/i18n/routing";
import { ErrorState } from "@/components/platform";
import { HealthStatusPill } from "@/components/admin/shared/status-badge";
import { KpiCard } from "@/components/admin/shared/kpi-card";
import type { DashboardSnapshot } from "@/domain/admin/dashboard";

export function PlatformStatusWidget({
  snapshot,
  t,
}: {
  snapshot: DashboardSnapshot;
  t: { title: string; view: string };
}) {
  if (snapshot.platformStatus.status !== "ok") {
    return <ErrorState title={t.title} message={snapshot.platformStatus.code} />;
  }
  return (
    <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{t.title}</h2>
      <div className="mt-4 flex items-center gap-3">
        <HealthStatusPill status={snapshot.platformStatus.data.overall} />
        <Link href="/admin/health" className="text-sm font-medium text-med-green hover:underline">
          {t.view}
        </Link>
      </div>
    </section>
  );
}

export function PendingApprovalsWidget({
  snapshot,
  t,
}: {
  snapshot: DashboardSnapshot;
  t: { label: string; hint: string };
}) {
  if (snapshot.pendingDoctorApprovals.status !== "ok") {
    return <ErrorState title={t.label} message={snapshot.pendingDoctorApprovals.code} />;
  }
  return (
    <KpiCard
      label={t.label}
      value={snapshot.pendingDoctorApprovals.data}
      href="/admin/doctors?pending=1"
      subtext={t.hint}
    />
  );
}
