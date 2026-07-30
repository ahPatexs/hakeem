import type { AppointmentMode, AppointmentStatus } from "@prisma/client";
import { DomainRuleError } from "./errors";

export const JOIN_WINDOW_BEFORE_MS = 15 * 60 * 1000;
export const JOIN_WINDOW_AFTER_MS = 60 * 60 * 1000;

export interface VideoVisit {
  mode: AppointmentMode;
  status: AppointmentStatus;
  startAt: Date;
}

/** Doctor host join follows the same window as the patient side. */
export function canDoctorJoinVideo(visit: VideoVisit, now: Date = new Date()): boolean {
  if (visit.mode !== "VIDEO") return false;
  if (visit.status !== "CONFIRMED" && visit.status !== "CHECKED_IN" && visit.status !== "IN_PROGRESS") {
    return false;
  }
  const t = now.getTime();
  return (
    t >= visit.startAt.getTime() - JOIN_WINDOW_BEFORE_MS &&
    t <= visit.startAt.getTime() + JOIN_WINDOW_AFTER_MS
  );
}

export function assertDoctorCanJoinVideo(visit: VideoVisit, now: Date = new Date()): void {
  if (!canDoctorJoinVideo(visit, now)) {
    throw new DomainRuleError("JOIN_WINDOW_CLOSED");
  }
}
