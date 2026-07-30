import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { auditLog } from "./audit";

function hashRefresh(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueRefreshCredential(userId: string) {
  const raw = randomBytes(48).toString("hex");
  const familyId = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.refreshCredential.create({
    data: {
      userId,
      tokenHash: hashRefresh(raw),
      familyId,
      expiresAt,
    },
  });
  return { raw, expiresAt, familyId };
}

export async function rotateRefreshCredential(rawToken: string) {
  const tokenHash = hashRefresh(rawToken);
  const current = await prisma.refreshCredential.findUnique({ where: { tokenHash } });
  if (!current || current.revokedAt || current.expiresAt.getTime() < Date.now()) {
    return null;
  }

  // Reuse detection: if already rotated away, revoke family
  const newer = await prisma.refreshCredential.findFirst({
    where: { rotatedFromId: current.id },
  });
  if (newer) {
    await prisma.refreshCredential.updateMany({
      where: { familyId: current.familyId },
      data: { revokedAt: new Date() },
    });
    await auditLog({
      type: "auth.refresh.reuse_revoked",
      outcome: "FAILURE",
      targetUserId: current.userId,
      meta: { familyId: current.familyId },
    });
    return null;
  }

  const nextRaw = randomBytes(48).toString("hex");
  const next = await prisma.refreshCredential.create({
    data: {
      userId: current.userId,
      tokenHash: hashRefresh(nextRaw),
      familyId: current.familyId,
      expiresAt: current.expiresAt,
      rotatedFromId: current.id,
    },
  });
  await prisma.refreshCredential.update({
    where: { id: current.id },
    data: { revokedAt: new Date() },
  });
  return { raw: nextRaw, userId: next.userId, expiresAt: next.expiresAt };
}

export async function revokeRefreshFamiliesForUser(userId: string) {
  await prisma.refreshCredential.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
