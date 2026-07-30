# Data Model: Administration Portal & Platform Management

**Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Extends `prisma/schema.prisma`. Reuses Module 1 `User` / `SecurityAuditEvent` / sessions, Module 2 appointments & payments, Module 2–3 AI conversations. Admin-authored ops key off `actorUserId` (ADMIN).

## Enum extensions / additions

### AccountStatus (existing)
`PENDING_VERIFICATION` | `ACTIVE` | `SUSPENDED` | `DEACTIVATED`

### DoctorApprovalStatus (existing)
`PENDING_APPROVAL` | `APPROVED` | `REJECTED`

### PaymentStatus (extend)
`PENDING` | `PAID` | `FAILED` | `REFUNDED` | `PARTIALLY_REFUNDED` | `DISPUTED`

### NotificationCategory (extend)
Add: `SECURITY` | `HEALTH` | `AI_GOVERNANCE` | `ADMIN_OPS`  
Keep: `APPOINTMENT` | `QUEUE` | `CLINICAL` | `DOCUMENTATION` | `RESULTS` | `PRESCRIPTION` | `PAYMENT` | `SYSTEM`

### HealthOverallStatus
`HEALTHY` | `DEGRADED` | `DOWN`

### HealthComponentKey
`APP` | `DATABASE` | `PAYMENTS` | `AI` | `TELEMEDICINE`

### AnnouncementSegment
`PATIENT` | `DOCTOR` | `ALL`

### PlatformSettingValueType
`BOOLEAN` | `STRING` | `JSON`

## Entity changes to existing models

### User (ops fields — mostly existing)
| Field | Notes |
|-------|--------|
| role / status / doctorApproval / doctorRejectionReason | Lifecycle |
| failedLoginCount / lockedUntil | Unlock clears both |
| createdByAdminId | Provisioning audit |
| aiDisabledAt / aiDisabledReason / aiDisabledByUserId | **Add** per-user AI disable (or use `UserAiRestriction` table) |

**Rules**: Cannot SUSPEND/DEACTIVATE self; cannot demote/suspend/deactivate last Active ADMIN; indexes `(role, status)`, `(doctorApproval)`.

### PaymentObligation (extend)
| Field | Type | Notes |
|-------|------|--------|
| refundedAmountCents | Int | default 0 |
| refundReason | String? | |
| refundedAt | DateTime? | |
| refundedByUserId | String? | ADMIN |
| disputeNote | String? | |
| disputedAt | DateTime? | |
| disputedByUserId | String? | |

**Rules**: `refundable = amountCents - refundedAmountCents`; full refund → `REFUNDED`; partial → `PARTIALLY_REFUNDED`; dispute → `DISPUTED` (may coexist with paid semantics via note—prefer status DISPUTED when marked).

### SecurityAuditEvent (existing — no destructive changes)
| Field | Notes |
|-------|--------|
| type | String event name |
| actorUserId / targetUserId | |
| outcome | SUCCESS \| FAILURE \| DENIED |
| meta | JSON (reason, before/after, export filters) |
| createdAt | |

**Rules**: Append-only from application; admin UI SELECT only.

### Notification (existing)
Admin recipients = users with `role=ADMIN`. Categories extended as above. Retain ≥90 days product policy.

### Doctor (CMS — bookable side effect)
If public listing uses `PublishStatus` / similar, approve/suspend workflows must update the flag used by public search (document exact field at implement time from current schema).

## New entities

### PlatformSetting
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| key | string | unique (e.g. `maintenanceMode`) |
| valueType | enum | |
| value | string | serialized |
| updatedAt | DateTime | |
| updatedByUserId | string? | |

**Seed keys**: `maintenanceMode`, `maintenanceMessage`, `supportEmail`, `supportPhone`, `ai.patientEnabled`, `ai.doctorDocumentationEnabled`, `ai.doctorPrescriptionEnabled`.

### SystemHealthSnapshot
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| overall | HealthOverallStatus | |
| checkedAt | DateTime | |
| components | Json | array of `{ key, ok, message, latencyMs? }` |

Keep latest N (e.g. 100) or only latest row + history table optional; v1: insert each check, read latest.

### AiFlaggedConversation
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| source | `PATIENT` \| `DOCTOR` | |
| conversationId | string | opaque |
| reason | string | |
| createdAt | DateTime | |
| reviewedAt | DateTime? | |
| reviewedByUserId | string? | |
| reviewNote | string? | |

### PlatformAnnouncement
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| title | string | |
| body | string | |
| segment | AnnouncementSegment | |
| publishedAt | DateTime | |
| publishedByUserId | string | |
| locale | LocaleCode? | optional dual publish |

On publish: create `Notification` rows for targeted users (batched) or store announcement + fan-out job; audit `admin.announcement.publish`.

### UserAiRestriction (alternative to columns on User)
| Field | Type | Notes |
|-------|------|--------|
| userId | string | PK/FK |
| disabledAt | DateTime | |
| reason | string | ≥10 chars |
| disabledByUserId | string | |

## State transitions

### User account
```text
PENDING_VERIFICATION → ACTIVE (verify / admin activate)
ACTIVE → SUSPENDED (admin, reason) → ACTIVE (reinstate)
ACTIVE|SUSPENDED → DEACTIVATED (admin soft close)
* → unlock clears lockout fields without status change
```

### Doctor approval
```text
PENDING_APPROVAL → APPROVED (idempotent if already APPROVED)
PENDING_APPROVAL → REJECTED (reason; idempotent if already REJECTED)
APPROVED + account SUSPENDED → not bookable; sessions revoked
```

### Payment refund
```text
PAID → PARTIALLY_REFUNDED (refundedAmount < amount)
PAID|PARTIALLY_REFUNDED → REFUNDED (refundedAmount == amount)
* → DISPUTED (annotation)
REFUNDED → block further refunds
```

### Platform health
```text
checks → snapshot.overall HEALTHY|DEGRADED|DOWN
```

## Validation rules (domain)

- Suspend / reject / refund / AI disable reasons: trim length ≥ 10.
- Refund amountCents: `1 .. refundable`.
- Role change to ADMIN: confirmation; last-admin guard on revoke.
- Setting `maintenanceMode`: boolean; when true non-admin gated.
- Export filters: require date range max span (e.g. 366 days) to protect DB.

## Indexes (add if missing)

- `PaymentObligation(status, createdAt)`
- `SecurityAuditEvent(actorUserId, createdAt)`
- `Appointment(status, startAt)` for active count
- `User(role, doctorApproval)` composite already partially covered
- `PlatformSetting(key)` unique
- `AiFlaggedConversation(reviewedAt, createdAt)`
