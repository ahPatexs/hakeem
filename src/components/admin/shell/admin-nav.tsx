"use client";

import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FolderHeart,
  Gauge,
  LayoutDashboard,
  Settings,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { portalNavClass, portalNavGroupClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";

const GROUPS = [
  {
    key: "groupOps" as const,
    items: [
      { href: "/admin", labelKey: "dashboard" as const, icon: LayoutDashboard, exact: true },
      { href: "/admin/users", labelKey: "users" as const, icon: Users },
      { href: "/admin/doctors", labelKey: "doctors" as const, icon: Stethoscope },
      { href: "/admin/appointments", labelKey: "appointments" as const, icon: CalendarDays },
      { href: "/admin/emr", labelKey: "emr" as const, icon: FolderHeart },
    ],
  },
  {
    key: "groupAi" as const,
    items: [
      { href: "/admin/ai", labelKey: "aiOps" as const, icon: Bot, exact: true },
      { href: "/admin/ai/usage", labelKey: "aiUsage" as const, icon: BarChart3 },
      { href: "/admin/ai/prompts", labelKey: "aiPrompts" as const, icon: Sparkles },
      { href: "/admin/ai/models", labelKey: "aiModels" as const, icon: Settings },
      { href: "/admin/ai/budgets", labelKey: "aiBudgets" as const, icon: Wallet },
      { href: "/admin/ai/monitoring", labelKey: "aiMonitoring" as const, icon: Gauge },
    ],
  },
  {
    key: "groupFinance" as const,
    items: [
      { href: "/admin/billing", labelKey: "billing" as const, icon: CreditCard },
      { href: "/admin/revenue", labelKey: "revenue" as const, icon: Wallet },
      { href: "/admin/analytics", labelKey: "analytics" as const, icon: BarChart3 },
    ],
  },
  {
    key: "groupMore" as const,
    items: [
      { href: "/admin/settings", labelKey: "settings" as const, icon: Settings },
      { href: "/admin/health", labelKey: "health" as const, icon: Activity },
      { href: "/admin/audit", labelKey: "audit" as const, icon: ClipboardList },
      { href: "/admin/notifications", labelKey: "notifications" as const, icon: Bell },
      { href: "/admin/roles", labelKey: "roles" as const, icon: Shield },
    ],
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");

  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label={t("menuLabel")}>
      {GROUPS.map((group) => (
        <div key={group.key}>
          <p className={portalNavGroupClass}>{t(group.key)}</p>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href, "exact" in item ? Boolean(item.exact) : false);
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
        </div>
      ))}
    </nav>
  );
}
