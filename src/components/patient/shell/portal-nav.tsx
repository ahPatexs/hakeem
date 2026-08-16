"use client";

import type { ComponentType } from "react";
import {
  Bot,
  CalendarDays,
  CreditCard,
  FileText,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Bell,
  Pill,
  Settings,
  Stethoscope,
  User,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { portalNavClass, portalNavGroupClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

export interface PortalNavItem {
  href: string;
  labelKey: keyof typeof NAV_KEYS;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
}

const NAV_KEYS = {
  dashboard: true,
  appointments: true,
  doctors: true,
  records: true,
  labs: true,
  prescriptions: true,
  payments: true,
  notifications: true,
  ai: true,
  aiHealth: true,
  profile: true,
  settings: true,
} as const;

export const PORTAL_NAV_ITEMS: PortalNavItem[] = [
  { href: "/patient", labelKey: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/patient/appointments", labelKey: "appointments", icon: CalendarDays },
  { href: "/patient/doctors", labelKey: "doctors", icon: Stethoscope },
  { href: "/patient/records", labelKey: "records", icon: FileText },
  { href: "/patient/labs", labelKey: "labs", icon: FlaskConical },
  { href: "/patient/prescriptions", labelKey: "prescriptions", icon: Pill },
  { href: "/patient/payments", labelKey: "payments", icon: CreditCard },
  { href: "/patient/notifications", labelKey: "notifications", icon: Bell },
  { href: "/patient/ai", labelKey: "ai", icon: Bot },
  { href: "/patient/ai/health", labelKey: "aiHealth", icon: HeartPulse },
  { href: "/patient/profile", labelKey: "profile", icon: User },
  { href: "/patient/settings", labelKey: "settings", icon: Settings },
];

const CARE_HREFS = new Set([
  "/patient",
  "/patient/appointments",
  "/patient/doctors",
  "/patient/records",
  "/patient/labs",
  "/patient/prescriptions",
]);

function isActive(
  pathname: string,
  href: string,
  exact?: boolean,
  allHrefs: string[] = [],
): boolean {
  if (exact) return pathname === href;
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  const hasMoreSpecific = allHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      (pathname === other || pathname.startsWith(`${other}/`)),
  );
  return !hasMoreSpecific;
}

function NavLinks({
  items,
  pathname,
  allHrefs,
  onNavigate,
  t,
}: {
  items: PortalNavItem[];
  pathname: string;
  allHrefs: string[];
  onNavigate?: () => void;
  t: (key: PortalNavItem["labelKey"]) => string;
}) {
  return (
    <>
      {items.map((item) => {
        const active = isActive(pathname, item.href, item.exact, allHrefs);
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

export function PortalNav({
  items = PORTAL_NAV_ITEMS,
  onNavigate,
  className,
}: {
  items?: PortalNavItem[];
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();
  const t = useTranslations("patient.nav");
  const allHrefs = items.map((i) => i.href);
  const care = items.filter((item) => CARE_HREFS.has(item.href));
  const more = items.filter((item) => !CARE_HREFS.has(item.href));
  const grouped = care.length > 0 && more.length > 0;

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label={t("menuLabel")}>
      {grouped ? (
        <>
          <p className={portalNavGroupClass}>{t("groupCare")}</p>
          <NavLinks items={care} pathname={pathname} allHrefs={allHrefs} onNavigate={onNavigate} t={t} />
          <p className={portalNavGroupClass}>{t("groupMore")}</p>
          <NavLinks items={more} pathname={pathname} allHrefs={allHrefs} onNavigate={onNavigate} t={t} />
        </>
      ) : (
        <NavLinks items={items} pathname={pathname} allHrefs={allHrefs} onNavigate={onNavigate} t={t} />
      )}
    </nav>
  );
}
