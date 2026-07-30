/**
 * Stub entrypoint for scheduled audit retention purge (FR-048).
 * Usage: `npx tsx scripts/purge-audit-events.ts`
 */
import { purgeExpiredAuditEvents, AUDIT_RETENTION_DAYS } from "../src/auth/audit-retention";

async function main() {
  const result = await purgeExpiredAuditEvents();
  console.info(
    `[audit-retention] purged ${result.deleted} events older than ${AUDIT_RETENTION_DAYS}d (cutoff ${result.cutoff.toISOString()})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
