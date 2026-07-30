"use server";

import { isAuthDomainError } from "@/auth/errors";
import { requireDoctorContext, isDoctorContextError, type DoctorContext } from "@/lib/doctor/context";
import { DomainRuleError } from "@/domain/doctor/errors";

export type DoctorActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string };

export type DoctorMutationResult = { ok: true } | { ok: false; code: string };

export async function withDoctor<T>(
  fn: (ctx: DoctorContext) => Promise<T>,
): Promise<DoctorActionResult<T>> {
  try {
    const ctx = await requireDoctorContext();
    const data = await fn(ctx);
    return { ok: true, data };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isDoctorContextError(error)) return { ok: false, code: error.code };
    if (error instanceof DomainRuleError) return { ok: false, code: error.code };
    console.error("[doctor action]", error);
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function withDoctorMutation(
  fn: (ctx: DoctorContext) => Promise<void>,
): Promise<DoctorMutationResult> {
  try {
    const ctx = await requireDoctorContext();
    await fn(ctx);
    return { ok: true };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isDoctorContextError(error)) return { ok: false, code: error.code };
    if (error instanceof DomainRuleError) return { ok: false, code: error.code };
    console.error("[doctor mutation]", error);
    return { ok: false, code: "UNKNOWN" };
  }
}
