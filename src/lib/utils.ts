import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** First given name, or the local-part of an email. */
export function firstName(full: string): string {
  const trimmed = full.trim();
  if (!trimmed) return "";
  if (trimmed.includes("@")) return trimmed.split("@")[0] ?? trimmed;
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function localizedText(locale: string, en?: string | null, ar?: string | null) {
  if (locale === "ar" && ar) return ar;
  return en ?? ar ?? "";
}
