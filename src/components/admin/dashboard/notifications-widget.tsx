import { Link } from "@/i18n/routing";
import { ErrorState } from "@/components/platform";
import type { DashboardSnapshot } from "@/domain/admin/dashboard";

export function RecentActivitiesWidget({
  snapshot,
  t,
}: {
  snapshot: DashboardSnapshot;
  t: { title: string; view: string; empty: string };
}) {
  return (
    <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-headline text-lg text-primary">{t.title}</h2>
        <Link href="/admin/audit" className="text-sm font-medium text-med-green hover:underline">
          {t.view}
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
          <p className="text-sm text-on-surface-variant">{t.empty}</p>
        )
      ) : (
        <ErrorState title={t.title} message={snapshot.recentActivities.code} />
      )}
    </section>
  );
}

export function NotificationsWidget({
  snapshot,
  t,
}: {
  snapshot: DashboardSnapshot;
  t: { title: string; unread: (c: number) => string; view: string };
}) {
  if (snapshot.unreadNotifications.status !== "ok") {
    return <ErrorState title={t.title} message={snapshot.unreadNotifications.code} />;
  }
  return (
    <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
      <h2 className="font-headline text-lg text-primary">{t.title}</h2>
      <p className="mt-4 text-sm">
        {t.unread(snapshot.unreadNotifications.data)}{" "}
        <Link href="/admin/notifications" className="font-medium text-med-green hover:underline">
          {t.view}
        </Link>
      </p>
    </section>
  );
}
