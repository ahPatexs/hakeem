"use client";

import { Bell, LogOut } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PatientSearch } from "@/components/doctor/patients/patient-search";
import { logoutAction } from "@/actions/auth/login";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { PersonAvatar } from "@/components/portal/person-avatar";

export function DoctorHeaderActions({
  unreadCount,
  displayName,
  specialty,
  photoUrl,
}: {
  unreadCount: number;
  displayName: string;
  specialty?: string | null;
  photoUrl?: string | null;
}) {
  const t = useTranslations("doctor.shell");
  const locale = useLocale();

  return (
    <div className="flex items-center gap-2">
      <LocaleSwitcher />
      <PatientSearch />
      <Button asChild variant="ghost" size="icon" className="relative rounded-full" aria-label={t("notifications")}>
        <Link href="/doctor/notifications">
          <Bell className="h-5 w-5 text-on-surface-variant" aria-hidden />
          {unreadCount > 0 ? (
            <span
              className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warm-coral px-1 text-[10px] font-bold text-white"
              aria-label={t("unreadCount", { count: unreadCount })}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Link>
      </Button>
      <Link
        href="/doctor/profile"
        className="flex items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-low py-1 pe-3 ps-1"
      >
        <PersonAvatar
          name={displayName}
          photoUrl={photoUrl}
          size="sm"
          className="h-8 w-8 text-xs font-bold ring-2 ring-primary/10"
        />
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="max-w-36 truncate text-xs font-semibold text-primary">{displayName}</span>
          {specialty ? (
            <span className="max-w-36 truncate text-[10px] text-on-surface-variant">{specialty}</span>
          ) : null}
        </span>
      </Link>
      <form action={logoutAction.bind(null, locale)}>
        <Button type="submit" variant="ghost" size="icon" className="rounded-full" aria-label={t("signOut")}>
          <LogOut className="h-5 w-5 text-on-surface-variant" />
        </Button>
      </form>
    </div>
  );
}