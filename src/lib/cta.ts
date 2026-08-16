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

  // Book: unauthenticated visitors sign in, then land on the patient doctor page.
  if (options?.doctorSlug) {
    const next = `/${locale}/patient/doctors/${options.doctorSlug}`;
    return withQuery(`/${locale}/login`, {
      next,
      utm_source: "website",
      utm_content: options?.page,
    });
  }

  return withQuery(`/${locale}/register`, {
    utm_source: "website",
    utm_content: options?.page,
  });
}
