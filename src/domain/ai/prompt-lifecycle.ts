export type PromptVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/**
 * Only draft versions may be published (archives any prior published row
 * in the transactional facade — not encoded here).
 */
export function canPublish(status: PromptVersionStatus): boolean {
  return status === "DRAFT";
}

/**
 * Rollback re-publishes a prior archived version as a new version row.
 * Current published versions are not rollback targets (they are already live).
 */
export function canRollback(status: PromptVersionStatus): boolean {
  return status === "ARCHIVED";
}

/** Alias kept for callers that phrase rollback as "from" a version. */
export function canRollbackFrom(status: PromptVersionStatus): boolean {
  return canRollback(status) || status === "PUBLISHED";
}

export function canSaveAsDraft(status: PromptVersionStatus): boolean {
  return status === "DRAFT";
}

export function statusAfterPublish(): PromptVersionStatus {
  return "PUBLISHED";
}

export function statusAfterArchive(): PromptVersionStatus {
  return "ARCHIVED";
}

/**
 * Whether a status transition is allowed by the append-only lifecycle.
 */
export function canTransition(
  from: PromptVersionStatus,
  action: "publish" | "rollback" | "archive",
): boolean {
  switch (action) {
    case "publish":
      return canPublish(from);
    case "rollback":
      return canRollback(from);
    case "archive":
      return from === "PUBLISHED";
    default:
      return false;
  }
}
