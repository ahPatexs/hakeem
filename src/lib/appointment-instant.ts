import { z } from "zod";

/** Server actions may revive slot times as Date objects or offset ISO strings. */
export const appointmentInstantSchema = z.preprocess((value) => {
  if (value instanceof Date) return value;
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return value;
}, z.date());