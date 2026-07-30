# Contract: Audit Events

**Feature**: `002-auth-rbac` | **Date**: 2026-07-29

Append-only `SecurityAuditEvent` rows. Retention ≥ 365 days.

## Event types

| type | When |
|------|------|
| `auth.login.success` | Credentials accepted + session created |
| `auth.login.failure` | Bad password / unknown user (no email leak in meta) |
| `auth.logout` | User logout |
| `auth.lockout` | Account locked after failures |
| `auth.unlock` | Admin unlock or lock expiry clear |
| `auth.register` | Patient registration attempt recorded |
| `auth.email_verify.success` | Email verified |
| `auth.email_verify.failure` | Bad/expired token |
| `auth.password_reset.request` | Reset email path |
| `auth.password_reset.success` | Password reset completed |
| `auth.password_change.success` | Authenticated password change |
| `auth.refresh.reuse_revoked` | Refresh reuse detected |
| `auth.session.revoke` | User/admin revoked session(s) |
| `authz.denied` | Privileged route/action denied |
| `admin.user.status_change` | Activate/suspend/deactivate |
| `admin.user.role_change` | Role assignment |
| `admin.doctor.create` | Doctor user created |
| `admin.doctor.approve` | Doctor approved |
| `admin.doctor.reject` | Doctor rejected |
| `admin.invite` | Admin invite sent |

## Meta rules

- Never store raw passwords, raw tokens, or full card/PHI payloads.
- May store reason codes, route keys, role from/to, challenge kind.
- Include `ipHash` + truncated user-agent when available.
