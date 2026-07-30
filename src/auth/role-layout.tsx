import { requireRole } from "@/auth/guards";
import { AuthDomainError } from "@/auth/errors";
import { redirect } from "@/i18n/routing";
import { auditLog } from "@/auth/audit";
import type { UserRole } from "@prisma/client";
import type { ReactNode } from "react";

export async function RoleLayoutGate({
  role,
  locale,
  children,
}: {
  role: UserRole;
  locale: string;
  children: ReactNode;
}) {
  try {
    await requireRole(role);
    return children;
  } catch (error) {
    if (error instanceof AuthDomainError) {
      if (role === "ADMIN" && (error.code === "FORBIDDEN" || error.code === "UNAUTHENTICATED")) {
        await auditLog({
          type: "admin.access.denied",
          outcome: "DENIED",
          meta: { required: role, code: error.code },
        }).catch(() => undefined);
      }
      if (error.code === "SESSION_EXPIRED") {
        redirect({ href: "/session-expired", locale });
      }
      if (error.code === "UNAUTHENTICATED") {
        redirect({ href: "/unauthorized", locale });
      }
      if (error.code === "FORBIDDEN") {
        redirect({ href: "/access-denied", locale });
      }
    }
    // Unexpected infra errors must not look like "no permission"
    console.error("[RoleLayoutGate]", error);
    redirect({ href: "/unauthorized", locale });
  }
}
