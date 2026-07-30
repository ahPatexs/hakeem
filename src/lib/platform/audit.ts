import type { AuditOutcome, Prisma } from "@prisma/client";
import { auditLog } from "@/auth/audit";

export type PlatformAuditInput = {
  type: string;
  outcome: AuditOutcome;
  actorUserId?: string | null;
  targetUserId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  meta?: Prisma.InputJsonValue;
};

/** Platform facade over append-only security audit events. */
export async function platformAudit(input: PlatformAuditInput): Promise<void> {
  await auditLog(input);
}
