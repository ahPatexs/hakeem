import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "./passwords";
import { auditLog } from "./audit";
import { AuthDomainError } from "./errors";
import { rateLimitLoginOrigin } from "./rate-limit";

export type AuthorizedUser = {
  id: string;
  email: string;
  name: string | null;
  role: User["role"];
};

function assertLoginEligible(user: User): void {
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AuthDomainError("ACCOUNT_LOCKED");
  }
  if (user.status === "SUSPENDED" || user.status === "DEACTIVATED") {
    throw new AuthDomainError("ACCOUNT_INACTIVE");
  }
  if (user.role === "PATIENT" && user.status === "PENDING_VERIFICATION") {
    throw new AuthDomainError("EMAIL_NOT_VERIFIED");
  }
  if (user.role === "DOCTOR") {
    if (user.doctorApproval !== "APPROVED" || user.status !== "ACTIVE") {
      throw new AuthDomainError("DOCTOR_NOT_APPROVED");
    }
  }
  if (user.role === "ADMIN") {
    if (user.status !== "ACTIVE" || !user.emailVerified) {
      throw new AuthDomainError("ACCOUNT_INACTIVE");
    }
  }
  if (!user.passwordHash) {
    throw new AuthDomainError("INVALID_CREDENTIALS");
  }
}

export async function authorizeCredentials(input: {
  email: string;
  password: string;
  ipHash?: string;
  userAgent?: string;
}): Promise<AuthorizedUser> {
  if (input.ipHash) rateLimitLoginOrigin(input.ipHash);

  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user?.passwordHash) {
    await auditLog({
      type: "auth.login.failure",
      outcome: "FAILURE",
      ipHash: input.ipHash,
      userAgent: input.userAgent,
      meta: { reason: "unknown_or_no_password" },
    });
    throw new AuthDomainError("INVALID_CREDENTIALS");
  }

  try {
    assertLoginEligible(user);
  } catch (error) {
    await auditLog({
      type: "auth.login.failure",
      outcome: "FAILURE",
      targetUserId: user.id,
      ipHash: input.ipHash,
      userAgent: input.userAgent,
      meta: { reason: error instanceof AuthDomainError ? error.code : "inactive" },
    });
    throw error;
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil =
      failedLoginCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : user.lockedUntil;
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount, lockedUntil },
    });
    if (lockedUntil && failedLoginCount >= 5) {
      await auditLog({
        type: "auth.lockout",
        outcome: "FAILURE",
        targetUserId: user.id,
        ipHash: input.ipHash,
      });
    }
    await auditLog({
      type: "auth.login.failure",
      outcome: "FAILURE",
      targetUserId: user.id,
      ipHash: input.ipHash,
      userAgent: input.userAgent,
      meta: { reason: "bad_password" },
    });
    throw new AuthDomainError(lockedUntil && failedLoginCount >= 5 ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
