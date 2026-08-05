"use client";

import { Bell } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function PatientHeaderActions({
  unreadCount,
  displayName,
}: {
  unreadCount: number;
  displayName: string;
}) {
  const t = useTranslations("patient.shell");

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="icon" className="relative rounded-full" aria-label={t("notifications")}>
        <Link href="/patient/notifications">
          <Bell className="h-5 w-5 text-on-surface-variant" aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warm-coral px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Link>
      </Button>
      <Link
        href="/patient/profile"
        className="hidden items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-low py-1 pe-3 ps-1 sm:flex"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary ring-2 ring-primary/10">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-36 truncate text-xs font-semibold text-primary">{displayName}</span>
      </Link>
    </div>
  );
}