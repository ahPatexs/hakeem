import type { Locale } from "./types";

export function pickLocalized<T extends string | null | undefined>(
  locale: Locale,
  en: T,
  ar: T,
): string {
  const primary = locale === "ar" ? ar : en;
  const fallback = locale === "ar" ? en : ar;
  const value = primary ?? fallback;
  return value ?? "";
}