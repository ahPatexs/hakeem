/**
 * Domain rule violations for doctor clinical workflows.
 * Codes align with specs/004-doctor-portal/contracts/doctor-api.md.
 */
export type DomainRuleCode =
  | "NOT_FOUND"
  | "INVALID_STATUS"
  | "ALREADY_IN_PROGRESS"
  | "SIGN_REQUIREMENTS"
  | "ALLERGY_BLOCK"
  | "SAFETY_ACK_REQUIRED"
  | "JOIN_WINDOW_CLOSED"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "VALIDATION_ERROR";

export class DomainRuleError extends Error {
  constructor(readonly code: DomainRuleCode, message?: string) {
    super(message ?? code);
    this.name = "DomainRuleError";
  }
}
