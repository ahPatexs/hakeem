import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";
import { touchSession, revokeSession } from "./session";
import {
  readSessionCookie,
  clearAuthCookies,
  SESSION_COOKIE,
} from "./cookies";
import { revokeRefreshFamiliesForUser } from "./refresh";
import { auditLog } from "./audit";

export type AppSession = {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role: UserRole;
  };
  sid: string;
};

/**
 * Opaque DB-backed session (FR-015). Cookie is only the sessionToken;
 * role/permissions always come from Postgres.
 *
 * IMPORTANT: This function is safe to call from Server Components.
 * It must NOT set/delete cookies (Next.js forbids cookie mutation in RSC).
 * Session refresh / cookie clears happen in Route Handlers or Server Actions.
 */
export async function auth(): Promise<AppSession | null> {
  const sid = await readSessionCookie();
  if (!sid) {
    return null;
  }

  const row = await prisma.session.findUnique({
    where: { sessionToken: sid },
    include: { user: true },
  });
  if (!row) {
    return null;
  }

  const touched = await touchSession(sid, row.user.role);
  if (!touched) {
    return null;
  }

  return {
    user: {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      role: row.user.role,
    },
    sid,
  };
}

export async function signOut(options?: { redirectTo?: string }) {
  const sid = await readSessionCookie();
  if (sid) {
    const row = await prisma.session.findUnique({ where: { sessionToken: sid } });
    if (row) {
      await revokeSession(sid);
      await revokeRefreshFamiliesForUser(row.userId);
      await auditLog({
        type: "auth.logout",
        outcome: "SUCCESS",
        actorUserId: row.userId,
      });
    }
  }
  await clearAuthCookies();
  if (options?.redirectTo) redirect(options.redirectTo);
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

/** Edge-safe: cookie presence only (full validation in Server Components). */
export function hasSessionCookieHeader(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((p) => p.trim().startsWith(`${SESSION_COOKIE}=`));
}

// Re-export NextAuth HTTP handlers for compatibility / CSRF token endpoint.
export { handlers } from "./config";
