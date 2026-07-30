export const ASIA_RIYADH = "Asia/Riyadh";

export type AppLocale = "en" | "ar";

/** Resolve locale from Accept-Language header and optional authenticated preference. */
export function resolveLocale(
  acceptLanguage: string | null | undefined,
  preference?: AppLocale | null,
): AppLocale {
  if (preference === "en" || preference === "ar") return preference;
  const header = (acceptLanguage ?? "").toLowerCase();
  if (header.startsWith("ar") || header.includes(",ar")) return "ar";
  return "en";
}

/** Format SAR amounts stored as halalas/cents (100 = 1 SAR). */
export function formatSar(cents: number, locale: AppLocale): string {
  const amount = cents / 100;
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
