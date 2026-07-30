"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/auth/guards";
import { auditLog } from "@/auth/audit";
import { isAuthDomainError } from "@/auth/errors";

export type ActionResult = { ok: true } | { ok: false; code: string };

export async function listMySessions() {
  const session = await auth();
  if (!session?.user?.id) return { ok: false as const, code: "UNAUTHENTICATED", sessions: [] };
  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id },
    orderBy: { lastActiveAt: "desc" },
    select: {
      id: true,
      sessionToken: true,
      lastActiveAt: true,
      expires: true,
      userAgent: true,
      rememberMe: true,
    },
  });
  return {
    ok: true as const,
    currentToken: session.sid,
    sessions: sessions.map((s) => ({
      id: s.id,
      lastActiveAt: s.lastActiveAt.toISOString(),
      expires: s.expires.toISOString(),
      userAgent: s.userAgent,
      rememberMe: s.rememberMe,
      isCurrent: s.sessionToken === session.sid,
    })),
  };
}

export async function revokeMySession(input: unknown): Promise<ActionResult> {
  const parsed = z.object({ sessionId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
  const session = await auth();
  if (!session?.user?.id) return { ok: false, code: "UNAUTHENTICATED" };
  await prisma.session.deleteMany({
    where: { id: parsed.data.sessionId, userId: session.user.id },
  });
  await auditLog({
    type: "auth.session.revoke",
    outcome: "SUCCESS",
    actorUserId: session.user.id,
    meta: { sessionId: parsed.data.sessionId },
  });
  return { ok: true };
}

export async function revokeOtherSessions(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id || !session.sid) return { ok: false, code: "UNAUTHENTICATED" };
  await prisma.session.deleteMany({
    where: { userId: session.user.id, sessionToken: { not: session.sid } },
  });
  await auditLog({
    type: "auth.session.revoke",
    outcome: "SUCCESS",
    actorUserId: session.user.id,
    meta: { scope: "others" },
  });
  return { ok: true };
}

export async function adminForceRevokeSessions(input: unknown): Promise<ActionResult> {
  try {
    const admin = await requirePermission("admin:users:write");
    const parsed = z.object({ userId: z.string().min(1) }).safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    await prisma.session.deleteMany({ where: { userId: parsed.data.userId } });
    await auditLog({
      type: "auth.session.revoke",
      outcome: "SUCCESS",
      actorUserId: admin.id,
      targetUserId: parsed.data.userId,
      meta: { scope: "admin_force" },
    });
    return { ok: true };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "FORBIDDEN" };
  }
}
