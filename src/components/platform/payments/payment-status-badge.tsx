import { StatusBadge } from "@/components/admin/shared/status-badge";

const STATUS_VARIANT: Record<
  string,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  PENDING: "warning",
  PAID: "success",
  FAILED: "danger",
  REFUNDED: "default",
  PARTIALLY_REFUNDED: "info",
  DISPUTED: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially refunded",
  DISPUTED: "Disputed",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge
      label={STATUS_LABEL[status] ?? status}
      variant={STATUS_VARIANT[status] ?? "default"}
    />
  );
}
