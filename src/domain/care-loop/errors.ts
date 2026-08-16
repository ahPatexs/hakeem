export type CareLoopErrorCode =
  | "SCHEDULE_MISSING"
  | "SLOT_OUTSIDE_HOURS"
  | "SLOT_UNAVAILABLE"
  | "SLOT_HORIZON"
  | "WEEKDAY_INVALID"
  | "HOURS_OVERLAP"
  | "NOT_FOUND"
  | "VALIDATION_ERROR";

export class CareLoopError extends Error {
  constructor(
    readonly code: CareLoopErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "CareLoopError";
  }
}

export function isCareLoopError(error: unknown): error is CareLoopError {
  return error instanceof CareLoopError;
}
