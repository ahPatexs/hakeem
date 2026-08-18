import { z } from "zod";

/** Server Actions may revive times as Date, ISO, offset ISO, or a timestamp. */
export function parseInstant(value: unknown): Date | null {
  if (value == null) return null;
  if (typeof value === "object" && typeof (value as { getTime?: unknown }).getTime === "function") {
    const ms = (value as Date).getTime();
    if (Number.isFinite(ms)) return new Date(ms);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value.trim());
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

export const appointmentInstantSchema = z.preprocess((value) => parseInstant(value) ?? value, z.date());