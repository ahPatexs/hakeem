import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE, REFRESH_COOKIE } from "./auth/cookies";

const intlMiddleware = createMiddleware(routing);

function stripLocale(pathname: string): { locale: string; rest: string[] } {
  const parts = pathname.split("/").filter(Boolean);
  const locale = parts[0] === "en" || parts[0] === "ar" ? parts[0] : routing.defaultLocale;
  const rest = parts[0] === "en" || parts[0] === "ar" ? parts.slice(1) : parts;
  return { locale, rest };
}

function hasCookie(req: NextRequest, name: string) {
  return Boolean(req.cookies.get(name)?.value);
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const { locale, rest } = stripLocale(pathname);
  const section = rest[0] ?? "";

  const isAuthed =
    hasCookie(req, SESSION_COOKIE) || hasCookie(req, REFRESH_COOKIE);

  const needsAuth =
    section === "patient" ||
    section === "doctor" ||
    section === "admin" ||
    section === "account";

  if (needsAuth && !isAuthed) {
    // Prefer session-expired when a marker cookie was cleared client-side
    const expiredHint = req.nextUrl.searchParams.get("reason") === "expired";
    const url = new URL(
      `/${locale}/${expiredHint ? "session-expired" : "unauthorized"}`,
      req.url,
    );
    if (!expiredHint) url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Role gates are enforced in layouts/pages (DB-backed). Middleware only ensures a cookie exists.
  // Login/register must NOT bounce on cookie presence alone (stale sid → expired loop).
  return intlMiddleware(req);
}

export const config = {
  matcher: ["/", "/(ar|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
