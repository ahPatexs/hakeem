export type Locale = "en" | "ar";

/** In-app auth routes (Module 1). Book still hands off to clinical app when configured. */
export function buildAppCtaUrl(
  path: "register" | "login" | "book",
  options?: { locale?: Locale; doctorSlug?: string; page?: string },
): string {
  const locale = options?.locale ?? "ar";

  if (path === "login" || path === "register") {
    const url = new URL(`/${locale}/${path}`, process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
    if (options?.page) url.searchParams.set("utm_content", options.page);
    return url.pathname + url.search;
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hakeem.example";
  const url = new URL(`/book`, base);
  if (options?.locale) url.searchParams.set("lang", options.locale);
  if (options?.doctorSlug) url.searchParams.set("doctor", options.doctorSlug);
  url.searchParams.set("utm_source", "website");
  if (options?.page) url.searchParams.set("utm_content", options.page);
  return url.toString();
}
