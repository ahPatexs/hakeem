import type { AuditOutcome, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function auditLog(input: {
  type: string;
  outcome: AuditOutcome;
  actorUserId?: string | null;
  targetUserId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.securityAuditEvent.create({
      data: {
        type: input.type,
        outcome: input.outcome,
        actorUserId: input.actorUserId ?? undefined,
        targetUserId: input.targetUserId ?? undefined,
        ipHash: input.ipHash ?? undefined,
        userAgent: input.userAgent ?? undefined,
        meta: input.meta,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write event", input.type, error);
  }
}
