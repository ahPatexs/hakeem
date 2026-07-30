import { headers } from "next/headers";

/**
 * CSRF helper for cookie-authenticated Route Handler mutations (FR-047).
 * Server Actions already enforce same-origin; use this for POST Route Handlers.
 */
export async function assertSameOriginMutation(): Promise<void> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  const site = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";

  if (!origin) {
    // Non-browser clients: allow only if explicitly no Origin (same as many APIs);
    // for browser POSTs Origin is required.
    const secFetchSite = h.get("sec-fetch-site");
    if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
      throw new Error("CSRF");
    }
    return;
  }

  try {
    const originHost = new URL(origin).host;
    const allowed = new Set<string>();
    if (host) allowed.add(host);
    if (site) {
      try {
        allowed.add(new URL(site).host);
      } catch {
        /* ignore */
      }
    }
    if (!allowed.has(originHost)) {
      throw new Error("CSRF");
    }
  } catch {
    throw new Error("CSRF");
  }
}

export function isCsrfError(error: unknown): boolean {
  return error instanceof Error && error.message === "CSRF";
}
