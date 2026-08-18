import { ASIA_RIYADH } from "@/domain/platform/localization";

const localeTag = (locale: string) => (locale === "ar" ? "ar-SA" : "en-GB");

const portalDateTimeOptions = (locale: string) => ({
  dateStyle: "medium" as const,
  timeStyle: "short" as const,
  timeZone: ASIA_RIYADH,
  ...(locale === "ar" ? { calendar: "gregory" as const } : {}),
});

export function formatPortalDate(value: Date | string, locale: string) {
  return new Date(value).toLocaleDateString(localeTag(locale), {
    dateStyle: "medium",
    timeZone: ASIA_RIYADH,
    ...(locale === "ar" ? { calendar: "gregory" as const } : {}),
  });
}

export function formatPortalDateTime(value: Date | string, locale: string) {
  return new Date(value).toLocaleString(localeTag(locale), portalDateTimeOptions(locale));
}

export function formatApptWhen(value: Date | string, locale: string) {
  return new Date(value).toLocaleString(localeTag(locale), {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ASIA_RIYADH,
  });
}

export function formatApptDay(value: Date | string, locale: string) {
  return new Date(value).toLocaleDateString(localeTag(locale), {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: ASIA_RIYADH,
  });
}

export function formatApptTime(value: Date | string, locale: string) {
  return new Date(value).toLocaleTimeString(localeTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ASIA_RIYADH,
  });
}

export function startOfLocalDay(value: Date = new Date()) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function localDayKey(value: Date | string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseLocalDayKey(dateKey: string): Date {
  const d = new Date(`${dateKey}T00:00:00`);
  return Number.isNaN(d.getTime()) ? startOfLocalDay() : d;
}

export function shiftLocalDay(dateKey: string, days: number): string {
  const d = parseLocalDayKey(dateKey);
  d.setDate(d.getDate() + days);
  return localDayKey(d);
}

/** Sunday-first week that contains `dateKey`. */
export function weekDayKeys(dateKey: string): string[] {
  const d = parseLocalDayKey(dateKey);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return localDayKey(day);
  });
}

export function zonedDayKey(value: Date | string, timeZone = ASIA_RIYADH) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function groupByZonedDay<T extends { startAt: string }>(items: T[], timeZone = ASIA_RIYADH) {
  let tz = timeZone || ASIA_RIYADH;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
  } catch {
    tz = ASIA_RIYADH;
  }
  const groups: { key: string; items: T[] }[] = [];
  const index = new Map<string, T[]>();
  for (const item of items) {
    const key = zonedDayKey(item.startAt, tz);
    let list = index.get(key);
    if (!list) {
      list = [];
      index.set(key, list);
      groups.push({ key, items: list });
    }
    list.push(item);
  }
  return groups;
}

export function waitMinutesSince(value: Date | string | null | undefined, now = new Date()) {
  if (!value) return 0;
  const start = new Date(value).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.round((now.getTime() - start) / 60000));
}

export function ageYears(value: Date | string | null | undefined, now = new Date()) {
  if (!value) return null;
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return null;
  let years = now.getFullYear() - dob.getFullYear();
  const month = now.getMonth() - dob.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < dob.getDate())) years -= 1;
  return years >= 0 ? years : null;
}
