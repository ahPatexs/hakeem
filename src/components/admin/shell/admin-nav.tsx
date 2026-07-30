"use client";

import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Settings,
  Shield,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", labelKey: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", labelKey: "users", icon: Users },
  { href: "/admin/doctors", labelKey: "doctors", icon: Stethoscope },
  { href: "/admin/appointments", labelKey: "appointments", icon: CalendarDays },
  { href: "/admin/ai", labelKey: "aiOps", icon: Bot },
  { href: "/admin/billing", labelKey: "billing", icon: CreditCard },
  { href: "/admin/revenue", labelKey: "revenue", icon: Wallet },
  { href: "/admin/analytics", labelKey: "analytics", icon: BarChart3 },
  { href: "/admin/settings", labelKey: "settings", icon: Settings },
  { href: "/admin/health", labelKey: "health", icon: Activity },
  { href: "/admin/audit", labelKey: "audit", icon: ClipboardList },
  { href: "/admin/notifications", labelKey: "notifications", icon: Bell },
  { href: "/admin/roles", labelKey: "roles", icon: Shield },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="Admin portal">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href, "exact" in item && item.exact);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            <span>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
