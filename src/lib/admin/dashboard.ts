import type { AppointmentStatus, PaymentStatus } from "@prisma/client";

export const ACTIVE_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
];

export const REFUNDABLE_STATUSES: PaymentStatus[] = ["PAID", "PARTIALLY_REFUNDED"];

export type WidgetResult<T> =
  | { status: "ok"; data: T }
  | { status: "error"; code: string };

export function settleWidget<T>(result: PromiseSettledResult<T>): WidgetResult<T> {
  if (result.status === "fulfilled") return { status: "ok", data: result.value };
  const code = result.reason instanceof Error ? result.reason.message : "UNKNOWN";
  return { status: "error", code };
}

export function periodStart(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}
