"use server";

/**
 * RETIRED (T143 / FR-033): Patient prescription reads must go through EMR facades
 * (`@/actions/emr/prescriptions`). Direct Prisma dual-stack is hard-guarded.
 */
export async function listPrescriptions(_input?: unknown) {
  return { ok: false as const, code: "GONE" as const, message: "Use emrListPrescriptions" };
}

export async function getPrescription(_input?: unknown) {
  return { ok: false as const, code: "GONE" as const, message: "Use emrGetPrescription" };
}
