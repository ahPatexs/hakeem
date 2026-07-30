"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authorizeCredentials } from "@/auth/credentials";
import { createUserSession } from "@/auth/session";
import { issueRefreshCredential } from "@/auth/refresh";
import { setSessionCookie, setRefreshCookie, clearAuthCookies, readSessionCookie } from "@/auth/cookies";
import { hashIp } from "@/auth/rate-limit";
import { isAuthDomainError } from "@/auth/errors";
import { auditLog } from "@/auth/audit";
import { homePathForRole } from "@/auth/rbac";
import { runMfaExtensionSeam } from "@/auth/mfa";
import { prisma } from "@/lib/prisma";
import { revokeSession } from "@/auth/session";
import { revokeRefreshFamiliesForUser } from "@/auth/refresh";

export type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; code: string };

export async function loginAction(input: unknown): Promise<LoginResult> {
  const parsed = z
    .object({
      email: z.string().email(),
      password: z.string().min(1),
      rememberMe: z.boolean().optional(),
      next: z.string().optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const userAgent = h.get("user-agent") ?? undefined;

  try {
    const user = await authorizeCredentials({
      email: parsed.data.email,
      password: parsed.data.password,
      ipHash: hashIp(ip),
      userAgent,
    });

    // FR-027 MFA seam — before session cookies are issued
    const mfa = await runMfaExtensionSeam({ userId: user.id, role: user.role });
    if (mfa === "challenge") {
      return { ok: false, code: "FORBIDDEN" };
    }

    const rememberMe = Boolean(parsed.data.rememberMe);
    const session = await createUserSession({
      userId: user.id,
      role: user.role,
      rememberMe,
      userAgent,
      ipHash: hashIp(ip),
    });

    await setSessionCookie(
      session.sessionToken,
      rememberMe ? 30 * 24 * 60 * 60 : 12 * 60 * 60,
    );

    if (rememberMe) {
      const refresh = await issueRefreshCredential(user.id);
      await setRefreshCookie(refresh.raw);
    }

    await auditLog({
      type: "auth.login.success",
      outcome: "SUCCESS",
      actorUserId: user.id,
      ipHash: hashIp(ip),
      userAgent,
    });

    const next = parsed.data.next;
    const redirectTo =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : homePathForRole(user.role);

    return { ok: true, redirectTo };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    console.error("[loginAction]", error);
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }
}

export async function logoutAction(locale: string) {
  const sid = await readSessionCookie();
  if (sid) {
    const row = await prisma.session.findUnique({ where: { sessionToken: sid } });
    if (row) {
      await revokeSession(sid);
      await revokeRefreshFamiliesForUser(row.userId);
      await auditLog({ type: "auth.logout", outcome: "SUCCESS", actorUserId: row.userId });
    }
  }
  await clearAuthCookies();
  redirect(`/${locale}/login`);
}
