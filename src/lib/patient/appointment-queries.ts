import type { AppointmentStatus, Prisma } from "@prisma/client";
import { startOfLocalDay } from "@/lib/datetime";

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

/** Prisma filter: today and future visits still in the care loop. Past dates belong in history. */
export function patientUpcomingWhere(
  userId: string,
  now: Date = new Date(),
): Prisma.AppointmentWhereInput {
  const today = startOfLocalDay(now);
  return {
    patientUserId: userId,
    AND: [
      {
        OR: [
          { status: { in: ["CONFIRMED", "HELD"] }, startAt: { gte: now } },
          { status: { in: ["CHECKED_IN", "IN_PROGRESS"] }, startAt: { gte: today } },
        ],
      },
      {
        OR: [{ status: { not: "HELD" } }, { holdExpiresAt: { gt: now } }],
      },
    ],
  };
}

/** Prisma filter: finished visits, plus overdue live visits from previous days. */
export function patientHistoryWhere(
  userId: string,
  now: Date = new Date(),
): Prisma.AppointmentWhereInput {
  const today = startOfLocalDay(now);
  return {
    patientUserId: userId,
    OR: [
      { status: { in: PATIENT_HISTORY_STATUSES } },
      { status: { in: ["CONFIRMED", "HELD"] }, startAt: { lt: now } },
      { status: { in: ["CHECKED_IN", "IN_PROGRESS"] }, startAt: { lt: today } },
    ],
  };
}
