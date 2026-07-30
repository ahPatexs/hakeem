import { createHash, randomBytes } from "crypto";
import type { AuthChallengeKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthDomainError } from "./errors";

const TTL_MS: Record<AuthChallengeKind, number> = {
  EMAIL_VERIFY: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
  INVITE_SET_PASSWORD: 72 * 60 * 60 * 1000,
};

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateRawToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createChallenge(input: {
  email: string;
  kind: AuthChallengeKind;
  userId?: string;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateRawToken();
  const expiresAt = new Date(Date.now() + TTL_MS[input.kind]);
  await prisma.authChallenge.create({
    data: {
      email: input.email.toLowerCase(),
      kind: input.kind,
      userId: input.userId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });
  return { rawToken, expiresAt };
}

export async function consumeChallenge(input: {
  rawToken: string;
  kind: AuthChallengeKind;
}) {
  const tokenHash = hashToken(input.rawToken);
  const challenge = await prisma.authChallenge.findUnique({ where: { tokenHash } });
  if (!challenge || challenge.kind !== input.kind) {
    throw new AuthDomainError("TOKEN_INVALID");
  }
  if (challenge.usedAt) throw new AuthDomainError("TOKEN_USED");
  if (challenge.expiresAt.getTime() < Date.now()) throw new AuthDomainError("TOKEN_EXPIRED");

  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { usedAt: new Date() },
  });

  return challenge;
}

export async function countRecentChallenges(email: string, kind: AuthChallengeKind, windowMs: number) {
  return prisma.authChallenge.count({
    where: {
      email: email.toLowerCase(),
      kind,
      createdAt: { gte: new Date(Date.now() - windowMs) },
    },
  });
}
