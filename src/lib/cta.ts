export type Locale = "en" | "ar";

function withQuery(pathname: string, params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** In-app marketing → product handoff (same deployment; relative paths). */
export function buildAppCtaUrl(
  path: "register" | "login" | "book",
  options?: { locale?: Locale; doctorSlug?: string; page?: string },
): string {
  const locale = options?.locale ?? "ar";

  if (path === "login" || path === "register") {
    return withQuery(`/${locale}/${path}`, { utm_content: options?.page });
  }

  // Book: public doctor profile when known; otherwise register to start the patient journey.
  const pathname = options?.doctorSlug
    ? `/${locale}/doctors/${options.doctorSlug}`
    : `/${locale}/register`;

  return withQuery(pathname, {
    utm_source: "website",
    utm_content: options?.page,
    doctor: options?.doctorSlug,
  });
}
