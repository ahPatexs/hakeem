import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "bg-surface-container-high text-on-surface-variant",
  success: "bg-med-green/15 text-med-green",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-warm-coral/15 text-warm-coral",
  info: "bg-primary/10 text-primary",
} as const;

export function StatusBadge({
  label,
  variant = "default",
  className,
}: {
  label: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        VARIANTS[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function HealthStatusPill({ status }: { status: string }) {
  const variant =
    status === "HEALTHY" ? "success" : status === "DEGRADED" || status === "UNKNOWN" ? "warning" : "danger";
  return <StatusBadge label={status} variant={variant} />;
}
