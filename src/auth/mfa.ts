import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * MFA extension seam (FR-027).
 * Called after password verification and before issuing session cookies.
 * When AUTH_MFA_ENFORCE=true and the user has an enabled MfaFactor, callers
 * should present a challenge instead of creating a session (TOTP first).
 */
export type MfaGateDecision = "pass" | "challenge";

export async function evaluateMfaGate(userId: string, _role: UserRole): Promise<MfaGateDecision> {
  if (process.env.AUTH_MFA_ENFORCE !== "true") return "pass";
  const count = await prisma.mfaFactor.count({
    where: { userId, enabledAt: { not: null } },
  });
  return count > 0 ? "challenge" : "pass";
}

/** Hook invoked from loginAction — currently no-ops unless enforce + factors. */
export async function runMfaExtensionSeam(ctx: {
  userId: string;
  role: UserRole;
}): Promise<MfaGateDecision> {
  return evaluateMfaGate(ctx.userId, ctx.role);
}
