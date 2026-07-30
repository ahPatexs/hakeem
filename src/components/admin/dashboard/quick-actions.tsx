"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Bot,
  ClipboardList,
  Settings,
  Stethoscope,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { href: "/admin/doctors?pending=1", labelKey: "approveDoctor", icon: Stethoscope },
  { href: "/admin/users", labelKey: "suspendUser", icon: UserX },
  { href: "/admin/analytics", labelKey: "analytics", icon: BarChart3 },
  { href: "/admin/settings", labelKey: "settings", icon: Settings },
  { href: "/admin/ai", labelKey: "aiOps", icon: Bot },
  { href: "/admin/audit", labelKey: "audit", icon: ClipboardList },
] as const;

export function QuickActions({ className }: { className?: string }) {
  const t = useTranslations("admin.dashboard.quickActions");
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-low px-4 py-2 text-sm font-medium text-primary hover:bg-surface-container-high"
          >
            <Icon className="h-4 w-4 text-med-green" aria-hidden />
            {t(action.labelKey)}
          </Link>
        );
      })}
    </div>
  );
}
