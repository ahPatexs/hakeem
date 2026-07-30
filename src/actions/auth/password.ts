"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createChallenge, consumeChallenge, countRecentChallenges } from "@/auth/tokens";
import {
  hashPassword,
  validatePasswordPolicy,
  assertNotInPasswordHistory,
  HISTORY_LIMIT,
} from "@/auth/passwords";
import { rateLimitEmailSend, hashIp } from "@/auth/rate-limit";
import { sendAuthEmail } from "@/auth/email";
import { auditLog } from "@/auth/audit";
import { revokeAllUserSessions } from "@/auth/session";
import { revokeRefreshFamiliesForUser } from "@/auth/refresh";
import { isAuthDomainError, AuthDomainError } from "@/auth/errors";
import { auth } from "@/auth";
import { verifyPassword } from "@/auth/passwords";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; code: string; fieldErrors?: Record<string, string[]> };

async function meta() {
  const h = await headers();
  return {
    ipHash: hashIp(h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip")),
    userAgent: h.get("user-agent"),
  };
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ email: z.string().email(), locale: z.enum(["en", "ar"]).optional() }).safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
  const email = parsed.data.email.toLowerCase();
  try {
    rateLimitEmailSend(email, "PASSWORD_RESET");
    const recent = await countRecentChallenges(email, "PASSWORD_RESET", 60 * 60 * 1000);
    if (recent >= 5) throw new AuthDomainError("RATE_LIMITED");

    const user = await prisma.user.findUnique({ where: { email } });
    if (user?.passwordHash) {
      const { rawToken } = await createChallenge({
        email,
        kind: "PASSWORD_RESET",
        userId: user.id,
      });
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const locale = parsed.data.locale ?? "ar";
      const url = `${site}/${locale}/reset-password?token=${rawToken}`;
      await sendAuthEmail({
        to: email,
        subject: "Reset your Hakeem password",
        text: `Reset password (expires in 1 hour): ${url}`,
        purpose: "auth.password_reset",
      });
    }
    await auditLog({ type: "auth.password_reset.request", outcome: "SUCCESS", ...(await meta()) });
    return { ok: true, message: "If an account exists, a reset link was sent." };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "RATE_LIMITED" };
  }
}

export async function resetPassword(input: unknown): Promise<ActionResult> {
  const parsed = z
    .object({ token: z.string().min(16), password: z.string().min(12).max(128) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
  try {
    let challenge;
    try {
      challenge = await consumeChallenge({
        rawToken: parsed.data.token,
        kind: "PASSWORD_RESET",
      });
    } catch {
      challenge = await consumeChallenge({
        rawToken: parsed.data.token,
        kind: "INVITE_SET_PASSWORD",
      });
    }
    const user = await prisma.user.findUnique({ where: { email: challenge.email } });
    if (!user) throw new AuthDomainError("TOKEN_INVALID");

    validatePasswordPolicy(parsed.data.password, user.email);
    const history = await prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    });
    await assertNotInPasswordHistory(
      parsed.data.password,
      history.map((h) => h.passwordHash),
    );

    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false, failedLoginCount: 0, lockedUntil: null },
      }),
      prisma.passwordHistory.create({ data: { userId: user.id, passwordHash } }),
    ]);
    await revokeAllUserSessions(user.id);
    await revokeRefreshFamiliesForUser(user.id);
    await auditLog({
      type: "auth.password_reset.success",
      outcome: "SUCCESS",
      actorUserId: user.id,
      ...(await meta()),
    });
    return { ok: true, message: "Password updated. You can sign in." };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "TOKEN_INVALID" };
  }
}

export async function changePassword(input: unknown): Promise<ActionResult> {
  const parsed = z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(12).max(128),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

  const session = await auth();
  if (!session?.user?.id || !session.sid) return { ok: false, code: "UNAUTHENTICATED" };

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.passwordHash) return { ok: false, code: "UNAUTHENTICATED" };
    const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!ok) return { ok: false, code: "INVALID_CREDENTIALS" };

    validatePasswordPolicy(parsed.data.newPassword, user.email);
    const history = await prisma.passwordHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    });
    await assertNotInPasswordHistory(
      parsed.data.newPassword,
      [user.passwordHash, ...history.map((h) => h.passwordHash)],
    );

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.passwordHistory.create({ data: { userId: user.id, passwordHash } }),
    ]);
    await revokeAllUserSessions(user.id, session.sid);
    await revokeRefreshFamiliesForUser(user.id);
    await auditLog({
      type: "auth.password_change.success",
      outcome: "SUCCESS",
      actorUserId: user.id,
      ...(await meta()),
    });
    return { ok: true, message: "Password changed." };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "VALIDATION_ERROR" };
  }
}
