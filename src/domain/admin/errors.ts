export type AdminDomainCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "SELF_ACTION_BLOCKED"
  | "LAST_ADMIN"
  | "ALREADY_APPROVED"
  | "ALREADY_REJECTED"
  | "REFUND_EXCEEDS_BALANCE"
  | "REFUND_NOT_ALLOWED"
  | "EXPORT_TOO_LARGE"
  | "AI_DISABLED"
  | "INVALID_STATUS";

export class AdminDomainError extends Error {
  constructor(
    readonly code: AdminDomainCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "AdminDomainError";
  }
}

export function isAdminDomainError(error: unknown): error is AdminDomainError {
  return error instanceof AdminDomainError;
}
