export type AppointmentMode = "IN_PERSON" | "VIDEO";

export type AppointmentStatus =
  | "HELD"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW"
  | "IN_PROGRESS";

/** Minutes before startAt when patient may join a video visit. */
export const JOIN_WINDOW_BEFORE_MS = 15 * 60 * 1000;

/** Minutes after startAt when patient may still join a video visit. */
export const JOIN_WINDOW_AFTER_MS = 60 * 60 * 1000;

export interface VideoAppointment {
  mode: AppointmentMode;
  status: AppointmentStatus;
  startAt: Date;
  endAt: Date;
}

export function canJoinVideo(appointment: VideoAppointment, now: Date = new Date()): boolean {
  if (appointment.mode !== "VIDEO") return false;
  if (appointment.status !== "CONFIRMED" && appointment.status !== "IN_PROGRESS") return false;

  const windowStart = appointment.startAt.getTime() - JOIN_WINDOW_BEFORE_MS;
  const windowEnd = appointment.startAt.getTime() + JOIN_WINDOW_AFTER_MS;
  const t = now.getTime();
  return t >= windowStart && t <= windowEnd;
}

export function getJoinWindow(appointment: Pick<VideoAppointment, "startAt">): { opensAt: Date; closesAt: Date } {
  return {
    opensAt: new Date(appointment.startAt.getTime() - JOIN_WINDOW_BEFORE_MS),
    closesAt: new Date(appointment.startAt.getTime() + JOIN_WINDOW_AFTER_MS),
  };
}
