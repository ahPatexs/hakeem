/**
 * Operational diagnostic retention policy (FR-047).
 * Distinct from immutable audit retention (>= 365 days).
 */
export const OPS_DIAGNOSTIC_RETENTION_DAYS = Math.max(
  30,
  Number(process.env.PLATFORM_OPS_RETENTION_DAYS ?? "30") || 30,
);

export const AUDIT_RETENTION_DAYS = Math.max(
  365,
  Number(process.env.PLATFORM_AUDIT_RETENTION_DAYS ?? "365") || 365,
);

export function opsDiagnosticCutoff(now = new Date()): Date {
  return new Date(now.getTime() - OPS_DIAGNOSTIC_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Purge video call-event rows older than ops retention.
 * AuditEvent rows are never purged here.
 */
export async function purgeExpiredOpsDiagnostics(): Promise<{ deletedCallEvents: number }> {
  const { prisma } = await import("@/lib/prisma");
  const cutoff = opsDiagnosticCutoff();
  const result = await prisma.videoCallEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return { deletedCallEvents: result.count };
}
