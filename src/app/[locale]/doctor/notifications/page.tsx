import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { listDoctorNotifications } from "@/actions/doctor/notifications";
import { MarkAllReadButton, MarkReadButton } from "@/components/doctor/notifications/notification-actions";
import { EmptyState, ErrorState, Pagination } from "@/components/doctor/shared";
import { formatPortalDateTime } from "@/lib/datetime";

export default async function DoctorNotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const t = await getTranslations("doctor.notifications");

  const result = await listDoctorNotifications({ page });
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const { items, total, unreadCount } = result.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl text-primary md:text-3xl">{t("title")}</h1>
          {unreadCount > 0 ? (
            <p className="mt-1 text-sm text-on-surface-variant">{t("unread", { count: unreadCount })}</p>
          ) : null}
        </div>
        <MarkAllReadButton disabled={unreadCount === 0} />
      </div>

      {items.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((n) => (
              <li
                key={n.id}
                className={`glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 ${!n.readAt ? "border-l-4 border-l-primary" : ""}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium text-primary">{n.title}</p>
                    {n.body ? <p className="mt-1 text-sm text-on-surface-variant">{n.body}</p> : null}
                    <p className="mt-1 text-xs text-on-surface-variant">{formatPortalDateTime(n.createdAt, locale)}</p>
                    {n.href ? (
                      <Link href={n.href} className="mt-2 inline-block text-sm font-medium text-med-green hover:underline">
                        →
                      </Link>
                    ) : null}
                  </div>
                  {!n.readAt ? <MarkReadButton notificationId={n.id} /> : null}
                </div>
              </li>
            ))}
          </ul>
          <Pagination page={page} pageSize={20} total={total} />
        </>
      )}
    </div>
  );
}
