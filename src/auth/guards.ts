import { auth, assertRole, assertPermission, type Permission } from "@/auth";
import type { UserRole } from "@prisma/client";
import { AuthDomainError } from "@/auth/errors";
import type { SessionUser } from "@/auth/rbac";
import { auditLog } from "@/auth/audit";
import { readSessionCookie, readRefreshCookie } from "@/auth/cookies";

export async function requireSession(): Promise<SessionUser> {
  const hadCookie =
    Boolean(await readSessionCookie()) || Boolean(await readRefreshCookie());
  const session = await auth();
  if (!session?.user?.id || !session.user.role || !session.sid) {
    throw new AuthDomainError(hadCookie ? "SESSION_EXPIRED" : "UNAUTHENTICATED");
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireSession();
  try {
    return assertRole(user, roles);
  } catch (error) {
    if (error instanceof AuthDomainError && error.code === "FORBIDDEN") {
      await auditLog({
        type: "authz.denied",
        outcome: "DENIED",
        actorUserId: user.id,
        meta: { required: roles, actual: user.role },
      });
    }
    throw error;
  }
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireSession();
  try {
    return assertPermission(user, permission);
  } catch (error) {
    if (error instanceof AuthDomainError && error.code === "FORBIDDEN") {
      await auditLog({
        type: "authz.denied",
        outcome: "DENIED",
        actorUserId: user.id,
        meta: { permission, actual: user.role },
      });
    }
    throw error;
  }
}
