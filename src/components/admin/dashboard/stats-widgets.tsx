import { KpiCard } from "@/components/admin/shared/kpi-card";
import { ErrorState } from "@/components/platform";
import type { DashboardSnapshot } from "@/domain/admin/dashboard";

export function StatsWidgets({
  snapshot,
  labels,
}: {
  snapshot: DashboardSnapshot;
  labels: { patients: string; doctors: string; active: string };
}) {
  return (
    <>
      {snapshot.totalPatients.status === "ok" ? (
        <KpiCard label={labels.patients} value={snapshot.totalPatients.data} href="/admin/users" />
      ) : (
        <ErrorState title={labels.patients} message={snapshot.totalPatients.code} />
      )}
      {snapshot.totalDoctors.status === "ok" ? (
        <KpiCard label={labels.doctors} value={snapshot.totalDoctors.data} href="/admin/doctors" />
      ) : (
        <ErrorState title={labels.doctors} message={snapshot.totalDoctors.code} />
      )}
      {snapshot.activeAppointments.status === "ok" ? (
        <KpiCard label={labels.active} value={snapshot.activeAppointments.data} href="/admin/appointments" />
      ) : (
        <ErrorState title={labels.active} message={snapshot.activeAppointments.code} />
      )}
    </>
  );
}
