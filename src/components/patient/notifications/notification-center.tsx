"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
import {
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
} from "@/actions/patient/notifications";
import type { Notification } from "@prisma/client";
import { cn } from "@/lib/utils";

export function NotificationCenter({
  items,
  total,
  page,
  pageSize,
  unreadCount,
}: {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}) {
  const t = useTranslations("patient.notifications");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function markAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  if (items.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">
          {t("unread", { count: unreadCount })}
        </p>
        {unreadCount > 0 ? (
          <Button variant="outline" size="sm" disabled={pending} onClick={markAll}>
            {t("markAllRead")}
          </Button>
        ) : null}
      </div>

      <ul className="divide-y divide-outline-variant/15 rounded-2xl border border-outline-variant/20 bg-surface-container-low">
        {items.map((n) => (
          <NotificationRow key={n.id} notification={n} onUpdate={() => router.refresh()} />
        ))}
      </ul>
      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}

function NotificationRow({
  notification,
  onUpdate,
}: {
  notification: Notification;
  onUpdate: () => void;
}) {
  const t = useTranslations("patient.notifications");
  const [pending, startTransition] = useTransition();
  const unread = !notification.readAt;

  function markRead() {
    startTransition(async () => {
      await markNotificationRead({ id: notification.id });
      onUpdate();
    });
  }

  function dismiss() {
    startTransition(async () => {
      await dismissNotification({ id: notification.id });
      onUpdate();
    });
  }

  return (
    <li className={cn("p-4", unread && "bg-primary/5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {notification.href ? (
            <Link href={notification.href} className="font-medium text-primary hover:underline">
              {notification.title}
            </Link>
          ) : (
            <p className="font-medium text-primary">{notification.title}</p>
          )}
          <p className="mt-1 text-sm text-on-surface-variant">{notification.body}</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          {unread ? (
            <Button variant="ghost" size="sm" disabled={pending} onClick={markRead}>
              {t("markRead")}
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" disabled={pending} onClick={dismiss}>
            {t("dismiss")}
          </Button>
        </div>
      </div>
    </li>
  );
}
