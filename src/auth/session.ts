import { createHash, randomBytes } from "crypto";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function idleMsForRole(role: UserRole): number {
  return role === "ADMIN" ? 15 * 60 * 1000 : 30 * 60 * 1000;
}

const ABSOLUTE_MS = 12 * 60 * 60 * 1000;
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 5;

export async function createUserSession(input: {
  userId: string;
  role: UserRole;
  rememberMe: boolean;
  userAgent?: string | null;
  ipHash?: string | null;
}) {
  const sessionToken = randomBytes(32).toString("hex");
  const now = Date.now();
  const idleMs = idleMsForRole(input.role);
  const absoluteMs = input.rememberMe ? REMEMBER_MS : ABSOLUTE_MS;

  const existing = await prisma.session.findMany({
    where: { userId: input.userId },
    orderBy: { lastActiveAt: "asc" },
  });
  if (existing.length >= MAX_SESSIONS) {
    const overflow = existing.length - MAX_SESSIONS + 1;
    const toDelete = existing.slice(0, overflow).map((s) => s.id);
    await prisma.session.deleteMany({ where: { id: { in: toDelete } } });
  }

  return prisma.session.create({
    data: {
      sessionToken,
      userId: input.userId,
      expires: new Date(now + absoluteMs),
      lastActiveAt: new Date(now),
      idleExpiresAt: new Date(now + idleMs),
      rememberMe: input.rememberMe,
      userAgent: input.userAgent ?? undefined,
      ipHash: input.ipHash ?? undefined,
    },
  });
}

export async function touchSession(sessionToken: string, role: UserRole) {
  const session = await prisma.session.findUnique({ where: { sessionToken } });
  if (!session) return null;
  const now = Date.now();
  if (session.expires.getTime() < now || session.idleExpiresAt.getTime() < now) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return prisma.session.update({
    where: { id: session.id },
    data: {
      lastActiveAt: new Date(now),
      idleExpiresAt: new Date(now + idleMsForRole(role)),
    },
  });
}

export async function revokeSession(sessionToken: string) {
  await prisma.session.deleteMany({ where: { sessionToken } });
}

export async function revokeAllUserSessions(userId: string, exceptToken?: string) {
  await prisma.session.deleteMany({
    where: {
      userId,
      ...(exceptToken ? { sessionToken: { not: exceptToken } } : {}),
    },
  });
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
