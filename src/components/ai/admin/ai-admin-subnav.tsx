"use client";

import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin/ai", labelKey: "navDashboard", exact: true },
  { href: "/admin/ai/usage", labelKey: "navUsage" },
  { href: "/admin/ai/prompts", labelKey: "navPrompts" },
  { href: "/admin/ai/models", labelKey: "navModels" },
  { href: "/admin/ai/budgets", labelKey: "navBudgets" },
  { href: "/admin/ai/monitoring", labelKey: "navMonitoring" },
] as const;

export function AiAdminSubnav() {
  const pathname = usePathname();
  const t = useTranslations("ai.admin");

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-outline-variant/20 pb-3 text-sm"
      aria-label={t("subnavLabel")}
    >
      {LINKS.map((item) => {
        const active =
          "exact" in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition-colors",
              active
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary",
            )}
            aria-current={active ? "page" : undefined}
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
