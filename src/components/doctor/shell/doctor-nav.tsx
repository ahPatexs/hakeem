"use client";

import {
  Bell,
  Bot,
  CalendarDays,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  Pill,
  Settings,
  User,
  Users,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { portalNavClass, portalNavGroupClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

const CARE_ITEMS = [
  { href: "/doctor", labelKey: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/doctor/schedule", labelKey: "schedule", icon: CalendarDays },
  { href: "/doctor/queue", labelKey: "queue", icon: ListChecks },
  { href: "/doctor/patients", labelKey: "patients", icon: Users },
  { href: "/doctor/prescriptions", labelKey: "prescriptions", icon: Pill },
  { href: "/doctor/labs", labelKey: "labs", icon: FlaskConical },
] as const;

const MORE_ITEMS = [
  { href: "/doctor/ai", labelKey: "ai", icon: Bot },
  { href: "/doctor/notifications", labelKey: "notifications", icon: Bell },
  { href: "/doctor/profile", labelKey: "profile", icon: User },
  { href: "/doctor/settings", labelKey: "settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  items,
  pathname,
  onNavigate,
  t,
}: {
  items: readonly (typeof CARE_ITEMS[number] | typeof MORE_ITEMS[number])[];
  pathname: string;
  onNavigate?: () => void;
  t: (key: (typeof CARE_ITEMS[number] | typeof MORE_ITEMS[number])["labelKey"]) => string;
}) {
  return (
    <>
      {items.map((item) => {
        const active = isActive(pathname, item.href, "exact" in item && item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={portalNavClass(active)}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </>
  );
}

export function DoctorNav({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const t = useTranslations("doctor.nav");

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label={t("menuLabel")}>
      <p className={portalNavGroupClass}>{t("groupCare")}</p>
      <NavLinks items={CARE_ITEMS} pathname={pathname} onNavigate={onNavigate} t={t} />
      <p className={portalNavGroupClass}>{t("groupMore")}</p>
      <NavLinks items={MORE_ITEMS} pathname={pathname} onNavigate={onNavigate} t={t} />
    </nav>
  );
}
