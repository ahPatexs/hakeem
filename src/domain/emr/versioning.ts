import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";

/**
 * Signed artifacts are immutable; amendments create a new version.
 * Returns true when `signedAt` is present and not in the future.
 */
export function canAmendSigned(
  signedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!signedAt) return false;
  return signedAt.getTime() <= now.getTime();
}

/** Amendments of signed clinical content require a non-empty reason (FR-039). */
export function requireAmendmentReason(
  reason: string | null | undefined,
): PlatformResult<{ reason: string }> {
  const trimmed = reason?.trim() ?? "";
  if (!trimmed) {
    return platformFail("VALIDATION_ERROR", "Amendment reason is required");
  }
  return platformOk({ reason: trimmed });
}

/**
 * Soft (optimistic) concurrency for draft in-place updates.
 * Callers compare the expected version token against the persisted version.
 */
export function checkSoftConcurrency(
  expectedVersion: number | string,
  actualVersion: number | string,
): PlatformResult<{ matched: true }> {
  if (String(expectedVersion) !== String(actualVersion)) {
    return platformFail("CONFLICT", "Record was modified by another session");
  }
  return platformOk({ matched: true });
}
