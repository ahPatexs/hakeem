# Data Model: Doctor Portal & Clinical Workspace

**Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Extends `prisma/schema.prisma`. Reuses Module 1 `User` (`role=DOCTOR`, `doctorProfileId → Doctor.id`) and Module 2 clinical tables. Doctor-authored artifacts key off `signerUserId` / `doctorId` (CMS) + `patientUserId`.

## Enum extensions / additions

### AppointmentStatus (extend)
`HELD` | `CONFIRMED` | `CHECKED_IN` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED` | `NO_SHOW` | `RESCHEDULED`

> Module 2 may already have most values; add `CHECKED_IN` and `RESCHEDULED` if missing.

### ClinicalNoteStatus
`DRAFT` | `FINAL` | `DISMISSED`

### PrescriptionStatus (extend)
`DRAFT` | `ACTIVE` | `COMPLETED` | `CANCELLED` | `EXPIRED`

### NotificationCategory (extend)
Add doctor-oriented use of existing + `DOCUMENTATION` | `RESULTS` | `QUEUE` (or map into `CLINICAL` / `APPOINTMENT` / `SYSTEM` with subtype field). Prefer:

`APPOINTMENT` | `QUEUE` | `DOCUMENTATION` | `RESULTS` | `PRESCRIPTION` | `SYSTEM`

### DoctorAiMode
`MEDICAL` | `DOCUMENTATION` | `PRESCRIPTION`

## Entity changes to existing models

### Appointment (extend)
| Field | Type | Notes |
|-------|------|--------|
| checkedInAt | DateTime? | queue ordering |
| completedAt | DateTime? | |
| noShowAt | DateTime? | |
| noShowReason | string? | |

**Rules**: ≤1 row with `status=IN_PROGRESS` per `doctorId` (enforce in transaction). Indexes: `(doctorId, status)`, `(doctorId, startAt)`, `(doctorId, checkedInAt)`.

### Prescription (extend)
| Field | Type | Notes |
|-------|------|--------|
| appointmentId | string? | FK optional |
| status | includes DRAFT | |
| signedAt | DateTime? | |
| signerUserId | string? | User DOCTOR |
| contentVersion | int | default 1 |
| allergyAckAt | DateTime? | when allergy data missing ack |
| interactionAckAt | DateTime? | high-severity ack |
| aiAssisted | boolean | default false |

### Notification (migrate)
| Field | Change |
|-------|--------|
| patientUserId | Rename/generalize → `recipientUserId` (FK User) |

Backfill: existing rows keep patient recipients. Doctor notifications use same table.

### PortalSettings (extend for doctors)
| Field | Type | Notes |
|-------|------|--------|
| timezone | string? | IANA; clinic day |
| notifyQueueEmail | boolean | |
| notifyDocumentationEmail | boolean | |
| notifyResultsEmail | boolean | |

(Patient-specific payment email flags remain.)

## New entities

### DoctorPatientPanel (optional v1)
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| doctorId | string | CMS Doctor |
| patientUserId | string | |
| createdAt | DateTime | |

**Unique**: `(doctorId, patientUserId)` — explicit care relationship beyond appointments.

### SoapNote
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| appointmentId | string | FK |
| patientUserId | string | |
| doctorId | string | CMS |
| authorUserId | string | |
| status | ClinicalNoteStatus | |
| version | int | starts 1 |
| parentNoteId | string? | prior version |
| subjective | string | |
| objective | string | |
| assessment | string | |
| plan | string | |
| contentHash | string | |
| signedAt | DateTime? | |
| signerUserId | string? | |
| amendmentReason | string? | |
| lateAmendment | boolean | default false |
| dismissedAt | DateTime? | |
| dismissReason | string? | |
| aiAssisted | boolean | |
| updatedAt | DateTime | optimistic concurrency |
| createdAt | DateTime | |

**Rules**: One logical note chain per appointment (latest version pointer queryable); FINAL immutable; amend creates new row; finalize requires non-empty assessment+plan.

### ClinicalSummary
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| appointmentId | string | |
| patientUserId | string | |
| doctorId | string | |
| authorUserId | string | |
| status | ClinicalNoteStatus | |
| version | int | |
| parentSummaryId | string? | |
| body | string | |
| contentHash | string | |
| signedAt / signerUserId | | |
| amendmentReason / lateAmendment | | |
| dismissedAt / dismissReason | | |
| aiAssisted | boolean | |
| updatedAt / createdAt | | |

**Rules**: Finalize requires non-empty body; same versioning as SOAP.

### PrescriptionLine
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| prescriptionId | string | FK |
| medicationName | string | |
| dose | string? | |
| route | string? | |
| frequency | string? | |
| duration | string? | |
| quantity | string? | |
| instructions | string? | |
| sortOrder | int | |

Migrate existing single-medication `Prescription.medicationName/instructions` into one line on write path for doctor module; keep denormalized summary fields for patient list compatibility if needed.

### LabReviewAcknowledgement
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| labResultId | string | |
| doctorUserId | string | |
| reviewedAt | DateTime | |

**Unique**: `(labResultId, doctorUserId)`

### DoctorAiConversation
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| doctorUserId | string | |
| mode | DoctorAiMode | |
| patientUserId | string? | when scoped |
| appointmentId | string? | |
| locale | LocaleCode | |
| createdAt / updatedAt | | |

### DoctorAiMessage
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| conversationId | string | |
| role | string | user\|assistant\|system |
| content | string | |
| createdAt | DateTime | |

### DoctorProfileExtras (optional 1:1 User)
| Field | Type | Notes |
|-------|------|--------|
| userId | string | PK |
| bio | string? | |
| languages | string[] | |
| consultationPrefs | Json? | Stitch fields |

CMS `Doctor` remains public catalog source; extras are portal-editable professional fields.

## Care relationship (derived)

Authorized if any of:
1. `Appointment` where `doctorId = session.doctorId` AND `patientUserId = target` AND `startAt >= now-24months` (any status except pure HELD expired), OR
2. `DoctorPatientPanel` row exists.

## State transitions

### Appointment (doctor ops)
```text
CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED
CONFIRMED | CHECKED_IN → NO_SHOW
CONFIRMED | CHECKED_IN | IN_PROGRESS → CANCELLED (ops/patient rules)
* → RESCHEDULED (replacement appointment created elsewhere)
```

### SOAP / Clinical Summary
```text
(none) → DRAFT → FINAL
FINAL → (amend) new DRAFT/FINAL version chain
DRAFT | FINAL → DISMISSED (with reason; audited; rare for FINAL)
```

### Prescription
```text
DRAFT → ACTIVE (sign)
ACTIVE → COMPLETED | CANCELLED | EXPIRED
```

## Validation rules (domain)

- Single `IN_PROGRESS` per doctor.
- Sign SOAP: assessment & plan non-empty.
- Sign summary: body non-empty.
- Sign Rx: ≥1 line; hard allergy match → block; missing allergy data → ack required; Cancelled/No-show visit-scoped Rx blocked.
- Amendment reason required; `lateAmendment` if `now - originalSignedAt > 72h`.
- AI Accept does not change status to FINAL/ACTIVE.

## Audit mapping

Reuse `SecurityAuditEvent.type` string catalog, e.g.:
`doctor.access.denied`, `doctor.chart.view`, `doctor.visit.start`, `doctor.visit.complete`, `doctor.visit.noshow`, `doctor.soap.finalize`, `doctor.soap.amend`, `doctor.rx.sign`, `doctor.ai.generate`, `doctor.video.join`, `doctor.lab.view`, `doctor.doc.download`
