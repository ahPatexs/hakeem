"use server";

/**
 * RETIRED (T143 / FR-033): Patient lab reads must go through EMR facades
 * (`@/actions/emr/diagnostics`). Direct Prisma dual-stack is hard-guarded.
 */
export async function listLabs(_input?: unknown) {
  return { ok: false as const, code: "GONE" as const, message: "Use emrListLabResults" };
}

export async function getLab(_input?: unknown) {
  return { ok: false as const, code: "GONE" as const, message: "Use emrGetLabResult" };
}
