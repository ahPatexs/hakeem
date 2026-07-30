"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { markNotificationRead } from "@/actions/admin/notifications";

export function NotificationList({
  items,
}: {
  items: Array<{
    id: string;
    category: string;
    title: string;
    body: string;
    href: string | null;
    readAt: Date | null;
    createdAt: Date;
  }>;
}) {
  const router = useRouter();
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
              <p className="mt-2 text-xs text-on-surface-variant">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            {!n.readAt ? (
              <button
                type="button"
                disabled={pending}
                className="text-xs font-medium text-med-green"
                onClick={() =>
                  startTransition(async () => {
                    await markNotificationRead({ id: n.id });
                    router.refresh();
                  })
                }
              >
                Mark read
              </button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
