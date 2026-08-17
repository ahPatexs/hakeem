import type { AppointmentStatus, Prisma } from "@prisma/client";
import { JOIN_WINDOW_AFTER_MS } from "@/domain/patient/video";

export const PATIENT_UPCOMING_STATUSES: AppointmentStatus[] = [
  "HELD",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
];

export const PATIENT_HISTORY_STATUSES: AppointmentStatus[] = [
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
];

const LIVE_STATUSES: AppointmentStatus[] = ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

/** Prisma filter: future bookings plus visits you can still attend or join. */
export function patientUpcomingWhere(
  userId: string,
  now: Date = new Date(),
): Prisma.AppointmentWhereInput {
  const joinWindowStart = new Date(now.getTime() - JOIN_WINDOW_AFTER_MS);
  return {
    patientUserId: userId,
    AND: [
      {
        OR: [
          { status: { in: LIVE_STATUSES }, endAt: { gte: now } },
          { status: { in: LIVE_STATUSES }, mode: "VIDEO", startAt: { gte: joinWindowStart } },
          { status: "HELD", startAt: { gte: now } },
        ],
      },
      {
        OR: [{ status: { not: "HELD" } }, { holdExpiresAt: { gt: now } }],
      },
    ],
  };
}

/** Prisma filter: finished visits, and live visits whose join/attend window has closed. */
export function patientHistoryWhere(
  userId: string,
  now: Date = new Date(),
): Prisma.AppointmentWhereInput {
  const joinWindowStart = new Date(now.getTime() - JOIN_WINDOW_AFTER_MS);
  return {
    patientUserId: userId,
    OR: [
      { status: { in: PATIENT_HISTORY_STATUSES } },
      { status: "HELD", OR: [{ startAt: { lt: now } }, { holdExpiresAt: { lte: now } }] },
      {
        status: { in: LIVE_STATUSES },
        endAt: { lt: now },
        OR: [{ mode: { not: "VIDEO" } }, { startAt: { lt: joinWindowStart } }],
      },
    ],
  };
}
