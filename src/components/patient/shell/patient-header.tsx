"use client";

import { Bell, LogOut } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth/login";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { PersonAvatar } from "@/components/portal/person-avatar";

export function PatientHeaderActions({
  unreadCount,
  displayName,
  photoUrl,
}: {
  unreadCount: number;
  displayName: string;
  photoUrl?: string | null;
}) {
  const t = useTranslations("patient.shell");
  const locale = useLocale();

  return (
    <div className="flex items-center gap-2">
      <LocaleSwitcher />
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
        className="flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-low py-1 pe-3 ps-1"
      >
        <PersonAvatar
          name={displayName}
          photoUrl={photoUrl}
          size="sm"
          className="h-8 w-8 text-xs font-bold ring-2 ring-primary/10"
        />
        <span className="hidden max-w-36 truncate text-xs font-semibold text-primary sm:inline">{displayName}</span>
      </Link>
      <form action={logoutAction.bind(null, locale)}>
        <Button type="submit" variant="ghost" size="icon" className="rounded-full" aria-label={t("signOut")}>
          <LogOut className="h-5 w-5 text-on-surface-variant" />
        </Button>
      </form>
    </div>
  );
}