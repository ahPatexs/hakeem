"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { markNotificationRead, markAllNotificationsRead } from "@/actions/doctor/notifications";

export function MarkReadButton({ notificationId }: { notificationId: string }) {
  const t = useTranslations("doctor.notifications");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await markNotificationRead({ notificationId });
          if (res.ok) router.refresh();
        });
      }}
    >
      {t("markRead")}
    </Button>
  );
}

export function MarkAllReadButton({ disabled }: { disabled?: boolean }) {
  const t = useTranslations("doctor.notifications");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={disabled || pending}
      onClick={() => {
        startTransition(async () => {
          const res = await markAllNotificationsRead();
          if (res.ok) router.refresh();
        });
      }}
    >
      {t("markAllRead")}
    </Button>
  );
}
