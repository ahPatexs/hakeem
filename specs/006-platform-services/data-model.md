# Data Model: Platform Services & Shared Infrastructure

**Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Reuse existing Auth/Patient/Admin entities where possible; add tables only for jobs, webhook idempotency, outbound tracking, and search projection.

## Existing entities (reuse)

| Entity | Role for Platform Services |
|--------|----------------------------|
| `User` / `PortalSettings` | Locale, email notify prefs, AI disable fields |
| `Notification` | In-app notifications (`href`, category, readAt) |
| `PaymentObligation` / `PaymentAttempt` | Billing lifecycle + provider refs / refunds |
| `PatientUpload` / `ClinicalDocument` / `MedicalRecord` | Files & medical docs + `UploadScanStatus` |
| `Appointment` | Video session binding |
| `AiConversation` / `DoctorAiConversation` + messages | AI turns |
| `SecurityAuditEvent` | Append-only audit |
| `PlatformSetting` / `SystemHealthSnapshot` | Flags, config, health |
| `Doctor` (CMS) | Discovery/bookable source for search |
| `AiFlaggedConversation` | AI governance review |

## New / extended entities

### BackgroundJob

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| type | enum/string | OUTBOUND_EMAIL, OUTBOUND_SMS, OUTBOUND_PUSH, MALWARE_SCAN, SEARCH_REFRESH_DOCTOR, WEBHOOK_SIDE_EFFECT, NOTIFY_ADMINS_FANOUT |
| idempotencyKey | string | Unique with type |
| payload | json | Minimal refs (ids), not secrets |
| state | enum | QUEUED \| RUNNING \| SUCCEEDED \| FAILED |
| attempts | int | default 0 |
| maxAttempts | int | default 5 |
| runAfter | datetime | backoff schedule |
| lastError | string? | Redacted class/message |
| lockedAt | datetime? | Claim lease |
| lockedBy | string? | Worker id |
| createdAt / updatedAt | datetime | |

**Validation**: `attempts < maxAttempts` to run; unique `(type, idempotencyKey)`.

**Transitions**: QUEUED → RUNNING → SUCCEEDED \| QUEUED (retry) \| FAILED (DLQ).

### WebhookReceipt

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| provider | string | e.g. payments |
| providerEventId | string | Unique with provider |
| eventType | string | |
| signatureValid | boolean | |
| processedAt | datetime? | |
| obligationId | string? | FK optional |
| rawHash | string | Hash of body for forensics (not full PHI dump) |
| createdAt | datetime | |

**Validation**: Reject insert duplicate `provider+providerEventId` → treat as idempotent success.

### OutboundMessage

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| channel | EMAIL \| SMS \| PUSH | |
| purpose | string | verify, reset, appointment, payment, … |
| recipientUserId | string? | |
| toAddress | string | email/phone/token ref (token hashed if push) |
| locale | LocaleCode | |
| templateKey | string? | |
| status | QUEUED \| SENT \| FAILED \| SKIPPED | |
| idempotencyKey | string | Unique |
| providerMessageId | string? | |
| relatedNotificationId | string? | |
| createdAt / sentAt | datetime | |

### NotificationEventPolicy (config; may be code const + optional DB override)

| Field | Notes |
|-------|-------|
| eventType | e.g. `appointment.confirmed` |
| channels | inApp / email / sms / push booleans |
| allowUserEmailOptOut | false for security/Auth |

v1 may ship as **code constants** in `domain/platform/notifications.ts` without a table; table optional for Admin editing later.

### SearchDoctorProjection

| Field | Type | Notes |
|-------|------|-------|
| doctorId | string | PK / FK CMS Doctor |
| nameEn / nameAr | string | |
| specialtyKeys | string[] | |
| city | string? | |
| isBookable | boolean | Derived |
| isPublished | boolean | |
| searchText | string | Normalized en+ar |
| indexedAt | datetime | |

**Refresh triggers**: Doctor publish, admin approve/suspend, profile update → enqueue `SEARCH_REFRESH_DOCTOR`.

### TimelineEvent (optional if not derived)

Prefer deriving timeline from appointments/documents/prescriptions/notifications in v1. Add table only if product needs unified feed persistence:

| Field | Notes |
|-------|-------|
| id, patientUserId, actorUserId?, kind, titleKey, href?, occurredAt, visibility |

**Recommendation**: v1 **derive** timeline in `lib/platform/timeline.ts`; defer table.

### PushDeviceRegistration

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | |
| userId | string | |
| tokenHash | string | Store hash; raw only at send time from client refresh |
| platform | WEB \| IOS \| ANDROID | |
| lastSeenAt | datetime | |
| revokedAt | datetime? | |

## Payment obligation state machine (shared)

```text
PENDING ──► PAID ──► PARTIALLY_REFUNDED ──► REFUNDED
   │          │              │
   ├──────────┴──► FAILED
   └──────────────► CANCELLED
PAID / PARTIALLY_REFUNDED ──► DISPUTED (annotation)
```

Rules: no backward to PENDING after PAID; refund amount ≤ remaining; webhook replay no-ops.

## Document availability state

```text
upload → scan PENDING → CLEAN (available) | REJECTED (unavailable)
signed clinical → immutable content
```

## Relationships (conceptual)

```text
User 1──* Notification
User 1──* OutboundMessage
User 1──* PushDeviceRegistration
PaymentObligation 1──* PaymentAttempt
PaymentObligation 1──* WebhookReceipt (optional link)
PatientUpload / ClinicalDocument ── storageKey → StoragePort
Appointment 1──0..1 VideoSession metadata (roomId on appointment or side table)
Doctor 1──1 SearchDoctorProjection
BackgroundJob (standalone; payload refs other ids)
```

## Indexes

- `BackgroundJob (state, runAfter)` and unique `(type, idempotencyKey)`
- `WebhookReceipt` unique `(provider, providerEventId)`
- `OutboundMessage` unique `idempotencyKey`
- `SearchDoctorProjection (isBookable, isPublished)` + full-text/trigram on `searchText` as available on Neon
- Existing notification/payment indexes retained

## Retention

- Audit: ≥365d floor (Auth); admin governance longer per Admin spec
- OutboundMessage / WebhookReceipt: ≥90d operational
- BackgroundJob SUCCEEDED: purge &gt;30d; FAILED retain ≥90d for ops
- Push registrations: remove on revoke/invalid token
