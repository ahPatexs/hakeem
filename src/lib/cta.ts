export type Locale = "en" | "ar";

export function buildAppCtaUrl(
  path: "register" | "login" | "book",
  options?: { locale?: Locale; doctorSlug?: string; page?: string },
): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hakeem.example";
  const url = new URL(`/${path}`, base);
  if (options?.locale) url.searchParams.set("lang", options.locale);
  if (options?.doctorSlug) url.searchParams.set("doctor", options.doctorSlug);
  url.searchParams.set("utm_source", "website");
  if (options?.page) url.searchParams.set("utm_content", options.page);
  return url.toString();
}
