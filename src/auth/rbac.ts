import type { UserRole } from "@prisma/client";
import { AuthDomainError } from "./errors";

export type Permission =
  | "account:read_self"
  | "account:change_password"
  | "account:manage_sessions_self"
  | "patient:portal"
  | "doctor:portal"
  | "doctor:chart:read"
  | "doctor:note:write"
  | "doctor:rx:sign"
  | "doctor:video:host"
  | "doctor:ai:use"
  | "admin:portal:access"
  | "admin:users:read"
  | "admin:users:write"
  | "admin:doctors:provision"
  | "admin:doctors:approve"
  | "admin:appointments:read"
  | "admin:appointments:write"
  | "admin:billing:read"
  | "admin:billing:refund"
  | "admin:ai:ops"
  | "admin:settings:write"
  | "admin:health:read"
  | "admin:analytics:read"
  | "admin:notifications:write"
  | "admin:roles:write"
  | "admin:audit:read";

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  PATIENT: [
    "account:read_self",
    "account:change_password",
    "account:manage_sessions_self",
    "patient:portal",
  ],
  DOCTOR: [
    "account:read_self",
    "account:change_password",
    "account:manage_sessions_self",
    "doctor:portal",
    "doctor:chart:read",
    "doctor:note:write",
    "doctor:rx:sign",
    "doctor:video:host",
    "doctor:ai:use",
  ],
  ADMIN: [
    "account:read_self",
    "account:change_password",
    "account:manage_sessions_self",
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
  ],
};

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  name?: string | null;
};

export function can(user: { role: UserRole }, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role].includes(permission);
}

export function hasRole(user: { role: UserRole }, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

export function assertRole(user: SessionUser | null | undefined, roles: UserRole[]): SessionUser {
  if (!user) throw new AuthDomainError("UNAUTHENTICATED");
  if (!hasRole(user, roles)) throw new AuthDomainError("FORBIDDEN");
  return user;
}

export function assertPermission(user: SessionUser | null | undefined, permission: Permission): SessionUser {
  if (!user) throw new AuthDomainError("UNAUTHENTICATED");
  if (!can(user, permission)) throw new AuthDomainError("FORBIDDEN");
  return user;
}

export function homePathForRole(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "DOCTOR":
      return "/doctor";
    default:
      return "/patient";
  }
}
