import type { Appointment, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ScheduleAppointment = Appointment & {
  patient: Pick<User, "id" | "name" | "email">;
};

const PATIENT_SELECT = { select: { id: true, name: true, email: true } } as const;

/** Parse YYYY-MM-DD into a local day range. */
export function parseDayRange(dateKey?: string): { start: Date; end: Date; key: string } {
  const base = dateKey ? new Date(`${dateKey}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) {
    return parseDayRange(undefined);
  }
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  return { start, end, key };
}

export async function getDaySchedule(doctorId: string, dateKey?: string) {
  const { start, end, key } = parseDayRange(dateKey);
  const items = await prisma.appointment.findMany({
    where: {
      doctorId,
      startAt: { gte: start, lt: end },
      status: { notIn: ["HELD"] },
    },
    orderBy: { startAt: "asc" },
    include: { patient: PATIENT_SELECT },
  });
  return { items, dateKey: key };
}

export async function getUpcomingAppointments(doctorId: string, take = 20) {
  return prisma.appointment.findMany({
    where: {
      doctorId,
      startAt: { gte: new Date() },
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
    },
    orderBy: { startAt: "asc" },
    take,
    include: { patient: PATIENT_SELECT },
  });
}

/** Today's live queue: checked-in first (FIFO by arrival), then in-progress. */
export async function getQueue(doctorId: string) {
  const { start, end } = parseDayRange();
  const [checkedIn, inProgress] = await Promise.all([
    prisma.appointment.findMany({
      where: { doctorId, status: "CHECKED_IN", startAt: { gte: start, lt: end } },
      orderBy: { checkedInAt: "asc" },
      include: { patient: PATIENT_SELECT },
    }),
    prisma.appointment.findMany({
      where: { doctorId, status: "IN_PROGRESS", startAt: { gte: start, lt: end } },
      orderBy: { startAt: "asc" },
      include: { patient: PATIENT_SELECT },
    }),
  ]);
  return { checkedIn, inProgress };
}

/** Appointment owned by this doctor, or null (opaque NOT_FOUND upstream). */
export async function getOwnedAppointment(doctorId: string, appointmentId: string) {
  return prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    include: { patient: PATIENT_SELECT },
  });
}
