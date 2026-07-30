import { setRequestLocale, getTranslations } from "next-intl/server";
import { listAdminNotifications } from "@/actions/admin/notifications";
import { EmptyState } from "@/components/platform";
import { NotificationList } from "@/components/admin/notifications/notification-list";
import { MarkAllReadButton } from "@/components/admin/notifications/mark-all-read-button";

export default async function AdminNotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("admin.notifications");
  const page = Number(sp.page ?? 1);
  const result = await listAdminNotifications({ page });
  if (!result.ok) return <p className="text-warm-coral">{result.code}</p>;
  const { items, unread } = result.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl text-primary">{t("title")}</h1>
          <p className="text-on-surface-variant">{t("subtitle")}</p>
        </div>
        {unread > 0 ? <MarkAllReadButton /> : null}
      </div>
      {items.length === 0 ? (
        <EmptyState title={t("allCaughtUp")} description={t("allCaughtUpHint")} />
      ) : (
        <NotificationList items={items} />
      )}
    </div>
  );
}
