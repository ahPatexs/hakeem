import { cookies } from "next/headers";

export const SESSION_COOKIE = "hakeem.sid";
export const REFRESH_COOKIE = "hakeem.refresh";

const isProd = process.env.NODE_ENV === "production";

export function sessionCookieOptions(maxAgeSeconds?: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    ...(maxAgeSeconds ? { maxAge: maxAgeSeconds } : {}),
  };
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  };
}

export async function setSessionCookie(sessionToken: string, maxAgeSeconds?: number) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken, sessionCookieOptions(maxAgeSeconds));
}

export async function setRefreshCookie(rawRefresh: string) {
  const jar = await cookies();
  jar.set(REFRESH_COOKIE, rawRefresh, refreshCookieOptions());
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function readSessionCookie(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE)?.value;
}

export async function readRefreshCookie(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(REFRESH_COOKIE)?.value;
}
