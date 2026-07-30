export type AppointmentStatus =
  | "HELD"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW"
  | "IN_PROGRESS";

/** Duration a held slot remains reserved before expiring. */
export const HOLD_MS = 10 * 60 * 1000;

/** Minimum time before startAt when cancel/reschedule is allowed. */
export const CANCEL_WINDOW_MS = 12 * 60 * 60 * 1000;

export interface AppointmentTiming {
  status: AppointmentStatus;
  startAt: Date;
  holdExpiresAt: Date | null;
}

export function computeHoldExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + HOLD_MS);
}

export function isHoldExpired(holdExpiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!holdExpiresAt) return true;
  return holdExpiresAt.getTime() <= now.getTime();
}

export function canConfirmHold(appointment: Pick<AppointmentTiming, "status" | "holdExpiresAt">, now: Date = new Date()): boolean {
  return appointment.status === "HELD" && !isHoldExpired(appointment.holdExpiresAt, now);
}

const CANCELLABLE_STATUSES = new Set<AppointmentStatus>(["HELD", "CONFIRMED"]);

export function canCancel(
  appointment: Pick<AppointmentTiming, "status" | "startAt">,
  now: Date = new Date(),
): boolean {
  if (!CANCELLABLE_STATUSES.has(appointment.status)) return false;
  if (appointment.status === "HELD") return true;
  return appointment.startAt.getTime() - now.getTime() > CANCEL_WINDOW_MS;
}

export function canReschedule(
  appointment: Pick<AppointmentTiming, "status" | "startAt">,
  now: Date = new Date(),
): boolean {
  if (appointment.status !== "CONFIRMED") return false;
  return appointment.startAt.getTime() - now.getTime() > CANCEL_WINDOW_MS;
}
