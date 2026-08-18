"use server";

import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import { isCareLoopError } from "@/domain/care-loop/errors";
import type { PatientActionResult, PatientMutationResult } from "@/actions/patient/types";

function unwrapPatientError(error: unknown): unknown {
  let current: unknown = error;
  for (let i = 0; i < 6; i += 1) {
    if (isAuthDomainError(current) || isCareLoopError(current)) return current;
    if (!current || typeof current !== "object" || !("cause" in current)) break;
    current = current.cause;
  }
  return error;
}

function toPatientFailure(error: unknown): { ok: false; code: string } {
  const unwrapped = unwrapPatientError(error);
  if (isAuthDomainError(unwrapped)) return { ok: false, code: unwrapped.code };
  if (isCareLoopError(unwrapped)) return { ok: false, code: unwrapped.code };
  console.error("[patient action]", error);
  return { ok: false, code: "UNKNOWN" };
}

export async function withPatient<T>(
  fn: (userId: string) => Promise<T>,
): Promise<PatientActionResult<T>> {
  try {
    const user = await requireRole("PATIENT");
    const data = await fn(user.id);
    return { ok: true, data };
  } catch (error) {
    return toPatientFailure(error);
  }
}

export async function withPatientMutation(
  fn: (userId: string) => Promise<void>,
): Promise<PatientMutationResult> {
  try {
    const user = await requireRole("PATIENT");
    await fn(user.id);
    return { ok: true };
  } catch (error) {
    return toPatientFailure(error);
  }
}
