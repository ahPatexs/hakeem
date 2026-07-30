"use client";

import { Bell } from "lucide-react";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PatientSearch } from "@/components/doctor/patients/patient-search";

export function DoctorHeaderActions({
  unreadCount,
  displayName,
  specialty,
}: {
  unreadCount: number;
  displayName: string;
  specialty?: string | null;
}) {
  const t = useTranslations("doctor.shell");

  return (
    <div className="flex items-center gap-2">
      <PatientSearch />
      <Button asChild variant="ghost" size="icon" className="relative" aria-label={t("notifications")}>
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
        className="hidden items-center gap-2 rounded-full border border-outline-variant/30 bg-surface-container-low py-1 pe-3 ps-1 sm:flex"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="max-w-36 truncate text-xs font-semibold text-primary">{displayName}</span>
          {specialty ? (
            <span className="max-w-36 truncate text-[10px] text-on-surface-variant">{specialty}</span>
          ) : null}
        </span>
      </Link>
    </div>
  );
}
