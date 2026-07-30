# Data Model: Patient Portal & Dashboard

**Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Extends `prisma/schema.prisma`. Reuses Module 1 `User` (`role=PATIENT`) and CMS `Doctor` / `Specialty`. All patient-owned rows key off `patientUserId → User.id`.

## Enums

### AppointmentStatus
`HELD` | `CONFIRMED` | `CANCELLED` | `COMPLETED` | `NO_SHOW` | `IN_PROGRESS`

### AppointmentMode
`IN_PERSON` | `VIDEO`

### LabReleaseStatus
`PENDING_REVIEW` | `RELEASED` | `RETRACTED` | `SUPERSEDED`

### LabResultPhase
`PRELIMINARY` | `FINAL`

### PrescriptionStatus
`ACTIVE` | `COMPLETED` | `CANCELLED` | `EXPIRED`

### PaymentStatus
`PENDING` | `PAID` | `FAILED` | `REFUNDED`

### NotificationCategory
`APPOINTMENT` | `CLINICAL` | `PRESCRIPTION` | `PAYMENT` | `SYSTEM`

### UploadScanStatus
`PENDING` | `CLEAN` | `REJECTED`

### ClinicalDocumentKind
`RECORD_ATTACHMENT` | `LAB_ATTACHMENT` | `PATIENT_UPLOAD` | `RECEIPT`

## Entities

### PatientProfile (1:1 User)
| Field | Type | Notes |
|-------|------|--------|
| userId | string | PK/FK User |
| phone | string? | |
| dateOfBirth | DateTime? | date |
| sexAtBirth | string? | per Stitch options |
| nationalIdLast4 | string? | avoid full national ID if possible |
| addressLine1/city/region | string? | |
| emergencyContactName/Phone | string? | |
| updatedAt | DateTime | |

### MedicalProfile (1:1 User)
| Field | Type | Notes |
|-------|------|--------|
| userId | string | PK/FK |
| bloodType | string? | |
| allergies | Json/string[] | |
| conditions | Json/string[] | |
| currentMedications | Json/string[] | patient-reported |
| notes | string? | |
| updatedAt | DateTime | |

### PatientUpload
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| patientUserId | string | FK |
| fileName | string | original |
| contentType | string | pdf/jpeg/png |
| sizeBytes | int | ≤10MB |
| storageKey | string | private path |
| scanStatus | UploadScanStatus | |
| purpose | string | profile\|insurance\|other |
| createdAt | DateTime | |

**Rules**: Max 20 active uploads/patient; delete storage on remove.

### Appointment
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| patientUserId | string | FK User |
| doctorId | string | FK CMS Doctor |
| mode | AppointmentMode | |
| status | AppointmentStatus | |
| startAt | DateTime | |
| endAt | DateTime | |
| holdExpiresAt | DateTime? | when HELD |
| locationText | string? | in-person |
| reason | string? | chief complaint brief |
| cancellationReason | string? | |
| rescheduledFromId | string? | self-FK |
| videoRoomId | string? | provider room |
| createdAt/updatedAt | DateTime | |

**Indexes**: `(patientUserId, startAt)`, `(doctorId, startAt)`, `(status, holdExpiresAt)`  
**Rules**: HELD ≤10m; confirm → CONFIRMED; cancel/reschedule if `startAt - now > 12h`; unique active slot per doctor (exclude CANCELLED/HELD expired).

### ClinicalDocument
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| patientUserId | string | |
| kind | ClinicalDocumentKind | |
| title | string | |
| contentType | string | |
| storageKey | string | |
| byteSize | int | |
| createdAt | DateTime | |

### MedicalRecord
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| patientUserId | string | |
| title | string | |
| recordType | string | encounter/summary/… |
| summary | string? | patient-visible |
| recordedAt | DateTime | |
| doctorId | string? | authoring clinician profile |
| documentId | string? | FK ClinicalDocument |
| createdAt | DateTime | |

### LabResult
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| patientUserId | string | |
| title | string | |
| panelCode | string? | |
| releaseStatus | LabReleaseStatus | patient sees RELEASED only |
| phase | LabResultPhase | |
| criticalFlag | boolean | banner if released |
| resultedAt | DateTime | |
| summary | string? | |
| documentId | string? | |
| supersededById | string? | |

### Prescription
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| patientUserId | string | |
| medicationName | string | |
| instructions | string | |
| status | PrescriptionStatus | |
| prescribedAt | DateTime | |
| startsAt/endsAt | DateTime? | |
| doctorId | string? | |
| documentId | string? | |

**Active rule**: `status=ACTIVE` AND (`endsAt` is null OR `endsAt > now`).

### PaymentObligation
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| patientUserId | string | |
| appointmentId | string? | |
| description | string | |
| amountCents | int | |
| currency | string | e.g. SAR |
| status | PaymentStatus | |
| providerRef | string? | |
| idempotencyKey | string | unique |
| receiptDocumentId | string? | |
| createdAt/updatedAt | DateTime | |

### PaymentAttempt
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| obligationId | string | |
| providerIntentId | string | |
| status | PaymentStatus | |
| rawEventId | string? | webhook dedupe |
| createdAt | DateTime | |

### Notification
| Field | Type | Notes |
|-------|------|--------|
| id | cuid | |
| patientUserId | string | |
| category | NotificationCategory | |
| title | string | localized key or text |
| body | string | |
| href | string? | in-app path without PHI ids leakage where possible |
| readAt | DateTime? | |
| dismissedAt | DateTime? | |
| createdAt | DateTime | |

**Display**: hide dismissed; retain ≥90 days for list.

### AiConversation / AiMessage
| Conversation | id, patientUserId, locale, createdAt, updatedAt |
| Message | id, conversationId, role(user\|assistant\|system), content, createdAt |

**Retention**: delete/anonymize messages older than 12 months (job).

### PortalSettings (1:1 User)
| Field | Type | Notes |
|-------|------|--------|
| userId | string | PK |
| locale | en\|ar | overlaps User.localePreference — single source: PortalSettings or User |
| notifyAppointmentEmail | boolean | |
| notifyClinicalEmail | boolean | |
| notifyPrescriptionEmail | boolean | |
| notifyPaymentEmail | boolean | |
| notifySystemEmail | boolean | |

## Relationships (overview)

```text
User (PATIENT)
  ├── PatientProfile
  ├── MedicalProfile
  ├── PortalSettings
  ├── PatientUpload[]
  ├── Appointment[] ── Doctor (CMS)
  ├── MedicalRecord[] ── ClinicalDocument?
  ├── LabResult[]
  ├── Prescription[]
  ├── PaymentObligation[] ── PaymentAttempt[]
  ├── Notification[]
  └── AiConversation[] ── AiMessage[]
```

## State transitions

### Appointment
`HELD` → `CONFIRMED` | (expire/delete)  
`CONFIRMED` → `CANCELLED` | `IN_PROGRESS` | `COMPLETED` | `NO_SHOW` | (reschedule creates new CONFIRMED + links `rescheduledFromId`, prior → CANCELLED)

### LabResult
`PENDING_REVIEW` → `RELEASED` → `RETRACTED` | `SUPERSEDED`

### PaymentObligation
`PENDING` → `PAID` | `FAILED` (retry stays/returns PENDING) → `REFUNDED`
