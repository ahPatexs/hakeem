import { setRequestLocale, getTranslations } from "next-intl/server";
import { listNotifications } from "@/actions/patient/notifications";
import { NotificationCenter } from "@/components/patient/notifications/notification-center";
import { ErrorState } from "@/components/patient/shared/error-state";

export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("patient.notifications");

  const page = Number(sp.page ?? "1") || 1;
  const result = await listNotifications({ page });
  if (!result.ok) {
    return <ErrorState title={t("loadError")} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="font-headline text-2xl text-primary">{t("title")}</h1>
      <NotificationCenter
        items={result.data.items}
        total={result.data.total}
        page={result.data.page}
        pageSize={result.data.pageSize}
        unreadCount={result.data.unreadCount}
      />
    </div>
  );
}
