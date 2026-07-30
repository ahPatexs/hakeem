import { prisma } from "@/lib/prisma";
import { AdminDomainError } from "@/domain/admin/errors";

export async function assertNotLastAdmin(userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, status: true } });
  if (!target || target.role !== "ADMIN" || target.status !== "ACTIVE") return;
  const count = await prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
  if (count <= 1) throw new AdminDomainError("LAST_ADMIN");
}

export function assertNotSelf(actorId: string, targetId: string) {
  if (actorId === targetId) throw new AdminDomainError("SELF_ACTION_BLOCKED");
}

export function validateReason(reason: string, min = 10) {
  const trimmed = reason.trim();
  if (trimmed.length < min) throw new AdminDomainError("VALIDATION_ERROR", "Reason too short");
  return trimmed;
}

export async function countActiveAdmins() {
  return prisma.user.count({ where: { role: "ADMIN", status: "ACTIVE" } });
}
