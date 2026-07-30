"use server";

import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import type { PatientActionResult, PatientMutationResult } from "@/actions/patient/types";

export async function withPatient<T>(
  fn: (userId: string) => Promise<T>,
): Promise<PatientActionResult<T>> {
  try {
    const user = await requireRole("PATIENT");
    const data = await fn(user.id);
    return { ok: true, data };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    console.error("[patient action]", error);
    return { ok: false, code: "UNKNOWN" };
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
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    console.error("[patient mutation]", error);
    return { ok: false, code: "UNKNOWN" };
  }
}
