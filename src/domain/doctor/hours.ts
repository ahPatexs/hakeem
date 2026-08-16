import { CareLoopError, type CareLoopErrorCode } from "@/domain/care-loop/errors";

export const SLOT_MINUTES = 30;
export const HORIZON_DAYS = 14;
export const DEFAULT_HOURS_TIMEZONE = "Asia/Riyadh";

export type WeeklyHoursWindow = {
  weekday: number;
  startMinutes: number;
  endMinutes: number;
};

export type UnavailableDayInput = {
  date: string;
  reason?: string | null;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function validateWeeklyWindow(window: WeeklyHoursWindow): CareLoopErrorCode | null {
  if (!Number.isInteger(window.weekday) || window.weekday < 0 || window.weekday > 6) {
    return "WEEKDAY_INVALID";
  }
  if (!Number.isInteger(window.startMinutes) || window.startMinutes < 0 || window.startMinutes > 1439) {
    return "HOURS_OVERLAP";
  }
  if (!Number.isInteger(window.endMinutes) || window.endMinutes <= window.startMinutes || window.endMinutes > 1440) {
    return "HOURS_OVERLAP";
  }
  if (window.startMinutes % SLOT_MINUTES !== 0 || window.endMinutes % SLOT_MINUTES !== 0) {
    return "HOURS_OVERLAP";
  }
  if ((window.endMinutes - window.startMinutes) % SLOT_MINUTES !== 0) {
    return "HOURS_OVERLAP";
  }
  return null;
}

export function validateWeeklyHours(week: WeeklyHoursWindow[]): CareLoopErrorCode | null {
  const seen = new Set<number>();
  for (const window of week) {
    const code = validateWeeklyWindow(window);
    if (code) return code;
    if (seen.has(window.weekday)) return "WEEKDAY_INVALID";
    seen.add(window.weekday);
  }
  return null;
}

export function assertWeeklyHours(week: WeeklyHoursWindow[]): void {
  const code = validateWeeklyHours(week);
  if (code) throw new CareLoopError(code);
}

export function validateUnavailableDate(date: string): CareLoopErrorCode | null {
  if (!YMD.test(date)) return "VALIDATION_ERROR";
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return "VALIDATION_ERROR";
  }
  return null;
}

export function assertUnavailableDate(date: string): void {
  const code = validateUnavailableDate(date);
  if (code) throw new CareLoopError(code);
}

export function minutesToTimeLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function timeLabelToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;
  return hours * 60 + mins;
}
