# Contract: Auth API

**Feature**: `002-auth-rbac` | **Date**: 2026-07-29

Primary mutations use **Server Actions** (preferred). Auth.js mounts at `/api/auth/*`. All inputs validated with **Zod**. Responses never include stack traces or whether an email exists (except authenticated change-password context).

## Auth.js routes

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/auth/[...nextauth]` | Auth.js handlers (CSRF, session, callback, signout) |
| GET | `/api/auth/session` | Current session JSON (Auth.js) |
| POST | `/api/auth/refresh` | Optional Remember Me refresh rotation (if not done in middleware) |

## Server Actions

### `registerPatient`
- **Input**: `{ email, password, name?, locale? }`
- **Auth**: none
- **Behavior**: Create PATIENT `PENDING_VERIFICATION`; hash password; send EMAIL_VERIFY; audit `user.register`
- **Output**: `{ ok: true }` always on valid shape (anti-enumeration if email exists → still ok, maybe send reset hint email policy)
- **Errors**: `VALIDATION_ERROR`, `RATE_LIMITED`

### `verifyEmail`
- **Input**: `{ token }` or `{ email, code }`
- **Behavior**: Consume EMAIL_VERIFY challenge ≤24h; set `emailVerified`, status ACTIVE; audit
- **Errors**: `TOKEN_INVALID`, `TOKEN_EXPIRED`, `TOKEN_USED`, `RATE_LIMITED`

### `requestPasswordReset`
- **Input**: `{ email }`
- **Output**: `{ ok: true }` always if validation passes
- **Behavior**: If eligible user, create PASSWORD_RESET challenge ≤1h; send email; audit request

### `resetPassword`
- **Input**: `{ token, password }`
- **Behavior**: Validate policy + history; update hash; consume token; revoke all sessions + refresh; audit
- **Errors**: `TOKEN_*`, `PASSWORD_POLICY`, `PASSWORD_REUSED`, `RATE_LIMITED`

### `changePassword`
- **Input**: `{ currentPassword, newPassword }`
- **Auth**: session required
- **Behavior**: Verify current; policy + history; update; revoke other sessions; audit

### `revokeSession` / `revokeOtherSessions`
- **Auth**: session required (or ADMIN for target user)
- **Behavior**: Delete session rows + related refresh; audit

### Admin: `createDoctorUser`
- **Auth**: ADMIN
- **Input**: `{ email, name, ... }`
- **Behavior**: Create DOCTOR + PENDING_APPROVAL; audit

### Admin: `approveDoctor` / `rejectDoctor` / `setUserStatus` / `inviteAdmin` / `assignRole`
- **Auth**: ADMIN
- **Behavior**: Enforce last-admin protection; on approve send INVITE_SET_PASSWORD; revoke sessions on suspend/deactivate

## Login / Logout

- **Login**: Server Action `loginAction({ email, password, rememberMe, next? })` issues opaque `hakeem.sid` (+ optional `hakeem.refresh`); maps failures to safe codes
- **Logout**: Server Action `logoutAction(locale)` revokes session + refresh families and clears cookies
- **MFA seam**: `runMfaExtensionSeam` runs after password success and before cookie issue (FR-027)

## Error code catalog

| Code | HTTP/UI meaning |
|------|-----------------|
| VALIDATION_ERROR | Field errors |
| INVALID_CREDENTIALS | Login failed (generic) |
| ACCOUNT_LOCKED | Lockout active |
| EMAIL_NOT_VERIFIED | Need verification |
| ACCOUNT_INACTIVE | Pending/suspended/deactivated/rejected |
| FORBIDDEN | RBAC denial |
| UNAUTHENTICATED | No session |
| SESSION_EXPIRED | Idle/absolute expiry |
| TOKEN_INVALID / TOKEN_EXPIRED / TOKEN_USED | Challenge problems |
| PASSWORD_POLICY / PASSWORD_REUSED | Password rules |
| RATE_LIMITED | Throttle |
| CSRF | Rejected mutation |
| LAST_ADMIN | Blocked admin removal |

## Localization

Error codes map to `messages/{en,ar}.json` → `auth.errors.*` and `auth.success.*`.

## Appendix: Future OAuth account linking (FR-026)

Out of scope for Module 1 runtime, but linking rules are fixed for a later provider rollout:

1. **Same email, verified IdP email** — Offer to link to the existing local `User` after successful password re-auth (or verified magic link). Never auto-merge without proof of control of the local account.
2. **Same email, unverified IdP email** — Do not link. Create no account collision; prompt the user to verify email with the IdP or use password login.
3. **Different email on IdP** — Treat as a new `Account` row only when the signed-in user explicitly links it from account settings; do not change primary `User.email` without confirmation.
4. **Doctor / Admin roles** — OAuth may authenticate but cannot elevate role. Role remains admin-assigned; IdP claims never grant `ADMIN` or auto-`approve` doctors.
5. **Session model** — Linked OAuth still issues the opaque `hakeem.sid` DB session after Auth.js callback; JWT from the IdP is not the portal trust root (FR-015).
6. **Unlink** — Users may unlink a provider only if at least one remaining credential exists (password hash or another linked provider).
