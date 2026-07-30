"use server";

export { assignRole, inviteAdmin } from "@/actions/auth/admin";

import { prisma } from "@/lib/prisma";
import { can, type Permission } from "@/auth/rbac";
import { withAdminPermission, type AdminActionResult } from "@/actions/admin/_helpers";
import type { UserRole } from "@prisma/client";

const PERMISSION_MATRIX: Permission[] = [
  "admin:portal:access",
  "admin:users:read",
  "admin:users:write",
  "admin:doctors:provision",
  "admin:doctors:approve",
  "admin:appointments:read",
  "admin:appointments:write",
  "admin:billing:read",
  "admin:billing:refund",
  "admin:ai:ops",
  "admin:settings:write",
  "admin:health:read",
  "admin:analytics:read",
  "admin:notifications:write",
  "admin:roles:write",
  "admin:audit:read",
];

export async function listRolesMatrix(): Promise<
  AdminActionResult<{
    roles: UserRole[];
    permissions: Permission[];
    matrix: Record<UserRole, Permission[]>;
  }>
> {
  return withAdminPermission("admin:roles:write", async () => {
    const roles: UserRole[] = ["PATIENT", "DOCTOR", "ADMIN"];
    const matrix = Object.fromEntries(
      roles.map((role) => [role, PERMISSION_MATRIX.filter((p) => can({ role }, p))]),
    ) as Record<UserRole, Permission[]>;
    return { roles, permissions: PERMISSION_MATRIX, matrix };
  });
}

export async function listAdminUsers(): Promise<
  AdminActionResult<Array<{ id: string; email: string; name: string | null; status: string }>>
> {
  return withAdminPermission("admin:roles:write", async () =>
    prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, email: true, name: true, status: true },
      orderBy: { email: "asc" },
    }),
  );
}

export { assignRole as assignUserRole } from "@/actions/auth/admin";
