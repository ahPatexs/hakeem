export type PatientActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: string; detail?: string };

export type PatientMutationResult = { ok: true } | { ok: false; code: string };
