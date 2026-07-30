import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusBadgeVariant =
  | "appointment"
  | "payment"
  | "lab"
  | "prescription"
  | "notification"
  | "default";

const APPOINTMENT_TONES: Record<string, string> = {
  HELD: "bg-amber-100 text-amber-800 border-amber-200",
  CONFIRMED: "bg-med-green/10 text-med-green border-med-green/20",
  CANCELLED: "bg-surface-container-highest text-on-surface-variant border-outline-variant/30",
  COMPLETED: "bg-primary/10 text-primary border-primary/20",
  NO_SHOW: "bg-red-100 text-red-800 border-red-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
};

const PAYMENT_TONES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  PAID: "bg-med-green/10 text-med-green border-med-green/20",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  REFUNDED: "bg-surface-container-highest text-on-surface-variant border-outline-variant/30",
};

const LAB_TONES: Record<string, string> = {
  RELEASED: "bg-med-green/10 text-med-green border-med-green/20",
  PENDING_REVIEW: "bg-amber-100 text-amber-800 border-amber-200",
  RETRACTED: "bg-red-100 text-red-800 border-red-200",
  SUPERSEDED: "bg-surface-container-highest text-on-surface-variant border-outline-variant/30",
  PRELIMINARY: "bg-amber-100 text-amber-800 border-amber-200",
  FINAL: "bg-primary/10 text-primary border-primary/20",
};

const PRESCRIPTION_TONES: Record<string, string> = {
  ACTIVE: "bg-med-green/10 text-med-green border-med-green/20",
  COMPLETED: "bg-primary/10 text-primary border-primary/20",
  CANCELLED: "bg-surface-container-highest text-on-surface-variant border-outline-variant/30",
  EXPIRED: "bg-surface-container-highest text-on-surface-variant border-outline-variant/30",
};

function toneFor(variant: StatusBadgeVariant, status: string): string {
  switch (variant) {
    case "appointment":
      return APPOINTMENT_TONES[status] ?? "bg-surface-container-high text-on-surface-variant";
    case "payment":
      return PAYMENT_TONES[status] ?? "bg-surface-container-high text-on-surface-variant";
    case "lab":
      return LAB_TONES[status] ?? "bg-surface-container-high text-on-surface-variant";
    case "prescription":
      return PRESCRIPTION_TONES[status] ?? "bg-surface-container-high text-on-surface-variant";
    default:
      return "bg-surface-container-high text-on-surface-variant";
  }
}

export function StatusBadge({
  status,
  label,
  variant = "default",
  className,
}: {
  status: string;
  label?: string;
  variant?: StatusBadgeVariant;
  className?: string;
}) {
  const display = label ?? status.replace(/_/g, " ");
  return (
    <Badge
      variant="outline"
      className={cn("border font-semibold capitalize", toneFor(variant, status), className)}
    >
      {display}
    </Badge>
  );
}
