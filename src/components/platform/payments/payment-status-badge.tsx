"use client";

import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/admin/shared/status-badge";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  PENDING: "warning",
  PROCESSING: "info",
  PAID: "success",
  FAILED: "danger",
  CANCELLED: "default",
  REFUNDED: "default",
  PARTIALLY_REFUNDED: "info",
  DISPUTED: "danger",
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const t = useTranslations("patient.payments.statuses");
  const known = [
    "PENDING",
    "PROCESSING",
    "PAID",
    "FAILED",
    "CANCELLED",
    "REFUNDED",
    "PARTIALLY_REFUNDED",
    "DISPUTED",
  ] as const;
  const label = known.includes(status as (typeof known)[number])
    ? t(status as (typeof known)[number])
    : status.replaceAll("_", " ");
  return <StatusBadge label={label} variant={STATUS_VARIANT[status] ?? "default"} />;
}
