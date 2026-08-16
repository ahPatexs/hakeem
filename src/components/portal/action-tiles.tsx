import type { ComponentType } from "react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export type ActionTile = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const TINTS = ["bg-primary/10 text-primary", "bg-med-green/10 text-med-green"] as const;

export function ActionTiles({
  actions,
  className,
}: {
  actions: ActionTile[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6", className)}>
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="group flex flex-col items-center gap-2.5 rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-4 text-center shadow-sm transition hover:border-med-green/30 hover:shadow-md motion-safe:hover:-translate-y-0.5"
          >
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full transition group-hover:scale-105",
                TINTS[index % TINTS.length],
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-xs font-semibold text-primary">{action.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
