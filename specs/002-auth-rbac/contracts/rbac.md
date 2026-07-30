# Contract: RBAC

**Feature**: `002-auth-rbac` | **Date**: 2026-07-29

## Roles

`PATIENT` | `DOCTOR` | `ADMIN` — exactly one per user; **no inheritance**.

## Permission catalog (v1)

| Permission | PATIENT | DOCTOR | ADMIN |
|------------|---------|--------|-------|
| `account:read_self` | ✓ | ✓ | ✓ |
| `account:change_password` | ✓ | ✓ | ✓ |
| `account:manage_sessions_self` | ✓ | ✓ | ✓ |
| `patient:portal` | ✓ | | |
| `doctor:portal` | | ✓ | |
| `admin:users:read` | | | ✓ |
| `admin:users:write` | | | ✓ |
| `admin:doctors:provision` | | | ✓ |
| `admin:doctors:approve` | | | ✓ |
| `admin:audit:read` | | | ✓ |

Clinical permissions (EMR, prescriptions, booking) belong to later modules; auth module only establishes the gate pattern.

## Server helpers (contract)

```text
requireSession(): SessionUser
requireRole(...roles: UserRole[]): SessionUser
requirePermission(permission: Permission): SessionUser
can(user, permission): boolean
```

Throw/return `UNAUTHENTICATED` | `FORBIDDEN` | `SESSION_EXPIRED` | `ACCOUNT_INACTIVE`.

## Route class mapping

| Prefix | Required |
|--------|----------|
| `/(auth)/login|register|…` | Guest or any (see plan) |
| `/account/*` | Any authenticated active role |
| `/patient/*` | PATIENT |
| `/doctor/*` | DOCTOR + APPROVED + ACTIVE |
| `/admin/*` | ADMIN + ACTIVE + emailVerified |
