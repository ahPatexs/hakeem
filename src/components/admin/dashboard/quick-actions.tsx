"use client";

import { useTranslations } from "next-intl";
import {
  BarChart3,
  Bot,
  ClipboardList,
  Settings,
  Stethoscope,
  UserX,
} from "lucide-react";
import { ActionTiles } from "@/components/portal/action-tiles";
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
    <div className={cn(className)}>
      <ActionTiles
        actions={ACTIONS.map((action) => ({
          href: action.href,
          label: t(action.labelKey),
          icon: action.icon,
        }))}
      />
    </div>
  );
}
