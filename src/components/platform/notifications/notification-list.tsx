"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { formatPortalDateTime } from "@/lib/datetime";

export type PlatformNotificationItem = {
  id: string;
  category: string;
  title: string;
  body: string;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function NotificationList({
  items,
  onMarkRead,
  markReadLabel = "Mark read",
}: {
  items: PlatformNotificationItem[];
  onMarkRead: (id: string) => Promise<{ ok: boolean } | void>;
  markReadLabel?: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <ul className="space-y-3">
      {items.map((n) => (
        <li
          key={n.id}
          className={`rounded-xl border border-outline-variant/20 p-4 ${n.readAt ? "opacity-70" : "bg-surface-container-low"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              {n.href ? (
                <Link href={n.href} className="font-medium text-primary hover:underline">
                  {n.title}
                </Link>
              ) : (
                <p className="font-medium text-primary">{n.title}</p>
              )}
              <p className="mt-1 text-sm text-on-surface-variant">{n.body}</p>
              <p className="mt-2 text-xs text-on-surface-variant">
                {formatPortalDateTime(n.createdAt, locale)}
              </p>
            </div>
            {!n.readAt ? (
              <button
                type="button"
                disabled={pending}
                className="text-xs font-medium text-med-green"
                onClick={() =>
                  startTransition(async () => {
                    await onMarkRead(n.id);
                    router.refresh();
                  })
                }
              >
                {markReadLabel}
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
