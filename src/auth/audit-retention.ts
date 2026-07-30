import { prisma } from "@/lib/prisma";

/** FR-048: retain security audit events for at least 365 days. */
export const AUDIT_RETENTION_DAYS = 365;

export function auditRetentionCutoff(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - AUDIT_RETENTION_DAYS);
  return cutoff;
}

/**
 * Purge job stub — delete audit rows older than retention window.
 * Schedule via cron / Vercel Cron calling `scripts/purge-audit-events.ts`.
 */
export async function purgeExpiredAuditEvents(now = new Date()) {
  const cutoff = auditRetentionCutoff(now);
  const result = await prisma.securityAuditEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return { deleted: result.count, cutoff };
}
