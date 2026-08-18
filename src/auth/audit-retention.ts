import { prisma } from "@/lib/prisma";
import { BILLING_AUDIT_RETENTION_DAYS } from "@/domain/billing/constants";

/** FR-048: retain security audit events for at least 365 days. */
export const AUDIT_RETENTION_DAYS = 365;
export { BILLING_AUDIT_RETENTION_DAYS };

export function isFinancialAuditType(type: string): boolean {
  return type.startsWith("billing.") || type.startsWith("admin.billing.");
}

export function auditRetentionCutoff(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - AUDIT_RETENTION_DAYS);
  return cutoff;
}

export function billingAuditRetentionCutoff(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - BILLING_AUDIT_RETENTION_DAYS);
  return cutoff;
}

/**
 * Purge job stub — delete audit rows older than retention window.
 * Financial billing.* / admin.billing.* events are kept for ≥6 years (FR-013).
 * Schedule via cron / Vercel Cron calling `scripts/purge-audit-events.ts`.
 */
export async function purgeExpiredAuditEvents(now = new Date()) {
  const cutoff = auditRetentionCutoff(now);
  const billingCutoff = billingAuditRetentionCutoff(now);
  const billingTypeFilter = {
    OR: [{ type: { startsWith: "billing." } }, { type: { startsWith: "admin.billing." } }],
  };

  const general = await prisma.securityAuditEvent.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      NOT: billingTypeFilter,
    },
  });
  const billing = await prisma.securityAuditEvent.deleteMany({
    where: {
      createdAt: { lt: billingCutoff },
      ...billingTypeFilter,
    },
  });
  return { deleted: general.count + billing.count, cutoff, billingCutoff };
}
