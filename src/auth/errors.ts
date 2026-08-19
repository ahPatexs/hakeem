export type AuthErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_INACTIVE"
  | "FORBIDDEN"
  | "UNAUTHENTICATED"
  | "SESSION_EXPIRED"
  | "TOKEN_INVALID"
  | "TOKEN_EXPIRED"
  | "TOKEN_USED"
  | "PASSWORD_POLICY"
  | "PASSWORD_REUSED"
  | "RATE_LIMITED"
  | "CSRF"
  | "LAST_ADMIN"
  | "DOCTOR_NOT_APPROVED";

export class AuthDomainError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message?: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message ?? code);
    this.name = "AuthDomainError";
  }
}

export function isAuthDomainError(error: unknown): error is AuthDomainError {
  if (error instanceof AuthDomainError) return true;
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? error.name : null;
  const code = "code" in error ? error.code : null;
  return name === "AuthDomainError" && typeof code === "string";
}
