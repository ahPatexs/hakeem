# Data Model: Authentication & Authorization (RBAC)

**Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Extends existing `prisma/schema.prisma` (public CMS models remain). Auth identity is separate from CMS `Doctor` profiles.

## Enums

### UserRole
- `PATIENT` | `DOCTOR` | `ADMIN`
- Exactly one per user (flat RBAC)

### AccountStatus
- `PENDING_VERIFICATION` — patient registered, email not verified
- `ACTIVE` — may create full session (subject to role gates)
- `SUSPENDED` — temporary block; sessions revoked
- `DEACTIVATED` — permanent/admin off; sessions revoked

### DoctorApprovalStatus (doctor users only; null for others)
- `PENDING_APPROVAL` — created, not approved
- `APPROVED` — may complete invite/password and login when `AccountStatus=ACTIVE`
- `REJECTED` — cannot login; reason stored on user

### AuthChallengeKind
- `EMAIL_VERIFY` | `PASSWORD_RESET` | `INVITE_SET_PASSWORD`

### AuditOutcome
- `SUCCESS` | `FAILURE` | `DENIED`

## Entities

### User
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | PK |
| email | string | unique, normalized lowercase |
| emailVerified | DateTime? | set on successful verify |
| name | string? | display name |
| passwordHash | string? | Argon2id; null if future OAuth-only |
| role | UserRole | required |
| status | AccountStatus | default PENDING_VERIFICATION for patients |
| doctorApproval | DoctorApprovalStatus? | doctors only |
| doctorRejectionReason | string? | when REJECTED |
| failedLoginCount | int | default 0 |
| lockedUntil | DateTime? | lockout window |
| mustChangePassword | boolean | invite/temp credential flows |
| localePreference | LocaleCode? | en/ar |
| doctorProfileId | string? | optional FK to CMS Doctor later |
| createdAt / updatedAt | DateTime | |
| createdByAdminId | string? | provisioning audit |

**Relations**: sessions, accounts (OAuth placeholder), refreshCredentials, passwordHistories, challenges, auditEventsActor, auditEventsTarget

**Validation**:
- Email unique across all roles
- Password policy enforced before hash write
- Doctors: `doctorApproval` required; login only if APPROVED + ACTIVE + password set
- Admins: emailVerified required before full admin session
- Cannot deactivate last ACTIVE ADMIN

### Account (Auth.js / future OAuth)
Standard Auth.js Account fields: `userId`, `type`, `provider`, `providerAccountId`, tokens…  
**v1**: unused for login; schema present for future OAuth.

### Session (Auth.js database session)
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| sessionToken | string | unique; opaque; cookie value |
| userId | string | FK User |
| expires | DateTime | absolute expiry |
| lastActiveAt | DateTime | idle tracking |
| idleExpiresAt | DateTime | computed idle deadline |
| userAgent | string? | device label source |
| ipHash | string? | privacy-preserving origin |
| rememberMe | boolean | whether refresh was issued |

**Rules**: Max 5 per user; LRU delete on overflow; revoke sets delete row (or expires immediately).

### VerificationToken (Auth.js adapter compatibility)
Keep Auth.js-required `VerificationToken` model (`identifier`, `token`, `expires`) if adapter expects it. Prefer app flows to use `AuthChallenge` below for verify/reset/invite so TTL and hashing are explicit.

### AuthChallenge
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| userId | string? | null if anti-enumeration path skipped persist |
| email | string | target email |
| kind | AuthChallengeKind | |
| tokenHash | string | SHA-256/HMAC of raw token |
| expiresAt | DateTime | 24h verify / 1h reset / invite TTL (e.g. 72h) |
| usedAt | DateTime? | single-use |
| createdAt | DateTime | |
| sendCountWindow | int | optional helper for rate limit |

### RefreshCredential
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| userId | string | |
| tokenHash | string | |
| familyId | string | reuse detection family |
| expiresAt | DateTime | ≤ 30 days from issue |
| rotatedFromId | string? | |
| revokedAt | DateTime? | |
| createdAt | DateTime | |

**Rules**: Rotate on use; reuse of old token → revoke all with same `familyId`.

### PasswordHistory
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| userId | string | |
| passwordHash | string | previous hash |
| createdAt | DateTime | |

Keep last 5; reject new password if matches any.

### SecurityAuditEvent
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| type | string | stable event name (see contracts/audit-events.md) |
| actorUserId | string? | |
| targetUserId | string? | |
| outcome | AuditOutcome | |
| ipHash | string? | |
| userAgent | string? | |
| meta | Json? | non-sensitive details |
| createdAt | DateTime | append-only |

No update/delete APIs in application code.

### MfaFactor (future — stub optional in v1 migration)
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| userId | string | |
| type | string | e.g. TOTP |
| secretEncrypted | string | |
| enabledAt | DateTime? | |
| createdAt | DateTime | |

Unused in v1 runtime.

## State transitions

### Patient
`register` → `PENDING_VERIFICATION` → (verify email) → `ACTIVE`  
Admin may `SUSPENDED` / `DEACTIVATED` from ACTIVE.

### Doctor
Admin create → User `DOCTOR` + `PENDING_APPROVAL` + status not login-eligible  
→ Approve → `APPROVED` + invite challenge `INVITE_SET_PASSWORD` → set password → `ACTIVE`  
→ Reject → `REJECTED`  
→ Suspend/Deactivate → revoke sessions

### Administrator
Bootstrap/invite → verify email → `ACTIVE`  
Cannot remove last ACTIVE admin.

## Indexes (recommended)

- `User.email` unique
- `Session.sessionToken` unique; `Session.userId + lastActiveAt`
- `AuthChallenge.tokenHash` unique; `AuthChallenge.email + kind + createdAt`
- `RefreshCredential.tokenHash` unique; `RefreshCredential.familyId`
- `SecurityAuditEvent.createdAt`; `type + createdAt`

## Relationship diagram

```text
User 1──* Session
User 1──* Account
User 1──* RefreshCredential
User 1──* AuthChallenge
User 1──* PasswordHistory
User 1──* SecurityAuditEvent (as actor or target)
User ?──? Doctor (CMS, optional later)
```
