"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { ErrorState } from "@/components/patient/shared/error-state";
import type { WidgetResult } from "@/lib/patient/dashboard";
import type { Notification } from "@prisma/client";
import { useRouter } from "@/i18n/routing";

export function NotificationsWidget({
  result,
}: {
  result: WidgetResult<{ unreadCount: number; items: Notification[] }>;
}) {
  const t = useTranslations("patient.dashboard.notifications");
  const router = useRouter();

  if (!result.ok) {
    return (
      <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <ErrorState className="mt-3" message={t("error")} onRetry={() => router.refresh()} />
      </section>
    );
  }

  const { unreadCount, items } = result.data;

  if (items.length === 0) {
    return (
      <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
        <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
        <EmptyState
          className="mt-3 border-0 bg-transparent py-6"
          title={t("emptyTitle")}
          actionLabel={t("viewAll")}
          actionHref="/patient/notifications"
        />
      </section>
    );
  }

  return (
    <section className="glass-card rounded-2xl border border-outline-variant/20 bg-surface-container-low p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-headline text-lg text-primary">
          {t("title")}
          {unreadCount > 0 ? (
            <span className="ms-2 rounded-full bg-med-green px-2 py-0.5 text-xs text-white">
              {unreadCount}
            </span>
          ) : null}
        </h2>
        <Link href="/patient/notifications" className="text-sm font-medium text-med-green hover:underline">
          {t("viewAll")}
        </Link>
      </div>
      <ul className="divide-y divide-outline-variant/15">
        {items.map((n) => (
          <li key={n.id} className="py-3 first:pt-0 last:pb-0">
            {n.href ? (
              <Link href={n.href} className="font-medium text-primary hover:underline">
                {n.title}
              </Link>
            ) : (
              <p className="font-medium text-primary">{n.title}</p>
            )}
            <p className="text-sm text-on-surface-variant line-clamp-2">{n.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
