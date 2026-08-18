import type { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_HOURS_TIMEZONE,
  HORIZON_DAYS,
  SLOT_MINUTES,
  type WeeklyHoursWindow,
} from "@/domain/doctor/hours";
import { CareLoopError, type CareLoopErrorCode } from "@/domain/care-loop/errors";

export type AvailabilitySlot = {
  startAt: string;
  endAt: string;
};

export type UnavailableReason = "NO_HOURS" | "NOT_BOOKABLE";

export type BlockingAppointment = {
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus | string;
  holdExpiresAt: Date | null;
};

export const BLOCKING_STATUSES: AppointmentStatus[] = [
  "HELD",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
];

const SLOT_MS = SLOT_MINUTES * 60 * 1000;
const WEEKDAY_SHORT: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const TIMEZONE_ALIASES: Record<string, string> = {
  egypt: "Africa/Cairo",
  cairo: "Africa/Cairo",
  riyadh: "Asia/Riyadh",
  ksa: "Asia/Riyadh",
  "saudi arabia": "Asia/Riyadh",
};

export function resolveIanaTimezone(
  value: string | null | undefined,
  fallback = DEFAULT_HOURS_TIMEZONE,
): string {
  const raw = value?.trim();
  if (!raw) return fallback;
  const mapped = TIMEZONE_ALIASES[raw.toLowerCase()] ?? raw;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: mapped }).format(new Date());
    return mapped;
  } catch {
    return fallback;
  }
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function wallToMs(wall: string): number {
  const [date, time] = wall.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second] = (time ?? "00:00:00").split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute, second ?? 0);
}

function formatWallInTz(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}:${get("second")}`;
}

export function formatYmdInTz(date: Date, timeZone: string): string {
  return formatWallInTz(date, timeZone).slice(0, 10);
}

export function weekdayInTz(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  return WEEKDAY_SHORT[weekday] ?? 0;
}

export function addCalendarDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

export function zonedWallTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const desired = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;
  let utc = new Date(`${desired}Z`);
  for (let i = 0; i < 4; i += 1) {
    const local = formatWallInTz(utc, timeZone);
    const diff = wallToMs(desired) - wallToMs(local);
    if (diff === 0) break;
    utc = new Date(utc.getTime() + diff);
  }
  return utc;
}

function ymdToParts(ymd: string): { year: number; month: number; day: number } {
  const [year, month, day] = ymd.split("-").map(Number);
  return { year, month, day };
}

function localMinutes(date: Date, timeZone: string): number {
  const wall = formatWallInTz(date, timeZone);
  const time = wall.slice(11);
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function isBlockingAppointment(row: BlockingAppointment, now: Date): boolean {
  if (!BLOCKING_STATUSES.includes(row.status as AppointmentStatus)) return false;
  if (row.status === "HELD") {
    return Boolean(row.holdExpiresAt && row.holdExpiresAt.getTime() > now.getTime());
  }
  return true;
}

function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && aEnd.getTime() > bStart.getTime();
}

export function generateDoctorAvailability(input: {
  week: WeeklyHoursWindow[];
  unavailableDates: string[];
  appointments: BlockingAppointment[];
  timezone: string;
  now?: Date;
}): { slots: AvailabilitySlot[]; unavailableReason?: "NO_HOURS" } {
  const now = input.now ?? new Date();
  const timezone = resolveIanaTimezone(input.timezone);
  if (input.week.length === 0) {
    return { slots: [], unavailableReason: "NO_HOURS" };
  }

  const byWeekday = new Map(input.week.map((window) => [window.weekday, window]));
  const unavailable = new Set(input.unavailableDates);
  const blockers = input.appointments.filter((row) => isBlockingAppointment(row, now));
  const todayYmd = formatYmdInTz(now, timezone);
  const slots: AvailabilitySlot[] = [];

  for (let offset = 0; offset < HORIZON_DAYS; offset += 1) {
    const ymd = addCalendarDays(todayYmd, offset);
    if (unavailable.has(ymd)) continue;
    const { year, month, day } = ymdToParts(ymd);
    const noon = zonedWallTimeToUtc(timezone, year, month, day, 12, 0);
    const weekday = weekdayInTz(noon, timezone);
    const window = byWeekday.get(weekday);
    if (!window) continue;

    for (let startMinutes = window.startMinutes; startMinutes + SLOT_MINUTES <= window.endMinutes; startMinutes += SLOT_MINUTES) {
      const hour = Math.floor(startMinutes / 60);
      const minute = startMinutes % 60;
      const startAt = zonedWallTimeToUtc(timezone, year, month, day, hour, minute);
      if (startAt.getTime() <= now.getTime()) continue;
      const endAt = new Date(startAt.getTime() + SLOT_MS);
      const occupied = blockers.some((row) => intervalsOverlap(startAt, endAt, row.startAt, row.endAt));
      if (occupied) continue;
      slots.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString() });
    }
  }

  return { slots };
}

export function classifyRequestedSlot(input: {
  startAt: Date;
  endAt: Date;
  week: WeeklyHoursWindow[];
  unavailableDates: string[];
  appointments: BlockingAppointment[];
  timezone: string;
  now?: Date;
}): CareLoopErrorCode | null {
  const now = input.now ?? new Date();
  const timezone = resolveIanaTimezone(input.timezone);
  if (Math.abs(input.endAt.getTime() - input.startAt.getTime() - SLOT_MS) > 1000) {
    return "SLOT_OUTSIDE_HOURS";
  }
  if (input.startAt.getTime() <= now.getTime()) return "SLOT_HORIZON";

  const todayYmd = formatYmdInTz(now, timezone);
  const lastYmd = addCalendarDays(todayYmd, HORIZON_DAYS - 1);
  const startYmd = formatYmdInTz(input.startAt, timezone);
  if (startYmd > lastYmd) return "SLOT_HORIZON";
  if (input.week.length === 0) return "SCHEDULE_MISSING";
  if (input.unavailableDates.includes(startYmd)) return "SLOT_OUTSIDE_HOURS";

  const weekday = weekdayInTz(input.startAt, timezone);
  const window = input.week.find((row) => row.weekday === weekday);
  if (!window) return "SLOT_OUTSIDE_HOURS";
  const minutes = localMinutes(input.startAt, timezone);
  if (minutes < window.startMinutes || minutes + SLOT_MINUTES > window.endMinutes) {
    return "SLOT_OUTSIDE_HOURS";
  }
  if (minutes % SLOT_MINUTES !== 0) return "SLOT_OUTSIDE_HOURS";

  const occupied = input.appointments
    .filter((row) => isBlockingAppointment(row, now))
    .some((row) => intervalsOverlap(input.startAt, input.endAt, row.startAt, row.endAt));
  if (occupied) return "SLOT_UNAVAILABLE";
  return null;
}

function ymdFromPrismaDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function loadDoctorScheduleContext(doctorId: string): Promise<{
  timezone: string;
  week: WeeklyHoursWindow[];
  unavailableDates: string[];
  appointments: BlockingAppointment[];
  bookable: boolean;
}> {
  const [doctor, week, unavailable, extrasUser, appointments] = await Promise.all([
    prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { status: true, isAvailable: true },
    }),
    prisma.doctorWeeklyHours.findMany({
      where: { doctorId },
      orderBy: { weekday: "asc" },
    }),
    prisma.doctorUnavailableDay.findMany({ where: { doctorId } }),
    prisma.user.findFirst({
      where: { doctorProfileId: doctorId },
      select: {
        status: true,
        doctorApproval: true,
        doctorProfileExtras: { select: { timezone: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        doctorId,
        status: { in: BLOCKING_STATUSES },
      },
      select: { startAt: true, endAt: true, status: true, holdExpiresAt: true },
    }),
  ]);

  const timezone = resolveIanaTimezone(
    extrasUser?.doctorProfileExtras?.timezone || week[0]?.timezone,
  );

  const bookable =
    doctor?.status === "PUBLISHED" &&
    doctor.isAvailable === true &&
    extrasUser?.status === "ACTIVE" &&
    extrasUser?.doctorApproval === "APPROVED";

  return {
    timezone,
    week: week.map((row) => ({
      weekday: row.weekday,
      startMinutes: row.startMinutes,
      endMinutes: row.endMinutes,
    })),
    unavailableDates: unavailable.map((row) => ymdFromPrismaDate(row.date)),
    appointments,
    bookable,
  };
}

async function loadBlockingAppointments(doctorId: string, ignoreAppointmentIds?: string[]) {
  const ignore = ignoreAppointmentIds?.filter(Boolean) ?? [];
  return prisma.appointment.findMany({
    where: {
      doctorId,
      status: { in: BLOCKING_STATUSES },
      ...(ignore.length > 0 ? { id: { notIn: ignore } } : {}),
    },
    select: { startAt: true, endAt: true, status: true, holdExpiresAt: true },
  });
}

export async function getDoctorAvailabilityByDoctorId(
  doctorId: string,
  options?: { now?: Date; ignoreAppointmentIds?: string[] },
): Promise<{
  slots: AvailabilitySlot[];
  timezone: string;
  unavailableReason?: UnavailableReason;
}> {
  const ctx = await loadDoctorScheduleContext(doctorId);
  if (!ctx.bookable) {
    return { slots: [], timezone: ctx.timezone, unavailableReason: "NOT_BOOKABLE" };
  }
  const appointments = options?.ignoreAppointmentIds?.length
    ? await loadBlockingAppointments(doctorId, options.ignoreAppointmentIds)
    : ctx.appointments;

  const generated = generateDoctorAvailability({
    week: ctx.week,
    unavailableDates: ctx.unavailableDates,
    appointments,
    timezone: ctx.timezone,
    now: options?.now,
  });
  return {
    slots: generated.slots,
    timezone: ctx.timezone,
    unavailableReason: generated.unavailableReason,
  };
}

export async function assertSlotIsOfferable(input: {
  doctorId: string;
  startAt: Date;
  endAt: Date;
  now?: Date;
  ignoreAppointmentIds?: string[];
}): Promise<void> {
  const ctx = await loadDoctorScheduleContext(input.doctorId);
  if (!ctx.bookable) throw new CareLoopError("SCHEDULE_MISSING");
  const blocking = input.ignoreAppointmentIds?.length
    ? await loadBlockingAppointments(input.doctorId, input.ignoreAppointmentIds)
    : ctx.appointments;

  let code: CareLoopErrorCode | null;
  try {
    code = classifyRequestedSlot({
      startAt: input.startAt,
      endAt: input.endAt,
      week: ctx.week,
      unavailableDates: ctx.unavailableDates,
      appointments: blocking,
      timezone: ctx.timezone,
      now: input.now,
    });
  } catch (error) {
    console.error("[assertSlotIsOfferable]", error);
    throw new CareLoopError("SCHEDULE_MISSING");
  }
  if (code) throw new CareLoopError(code);
}
