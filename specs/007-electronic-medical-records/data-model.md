# Data Model: Electronic Medical Records (EMR)

**Feature**: `007-electronic-medical-records`  
**Date**: 2026-08-04  
**Storage**: Neon PostgreSQL via Prisma

## Overview

EMR extends existing clinical tables from Patient/Doctor portals and adds missing longitudinal chart domains. All patient-bound rows key on `patientUserId` → `User.id`.

```text
User (Patient)
 └── PatientChart (logical; may be implicit via user id)
      ├── History domains (Allergy, Condition, Immunization, FamilyHistory, Lifestyle, EmergencyInfo)
      ├── ClinicalEncounter ↔ Appointment (often 1:1 with visit)
      │    ├── Diagnosis*
      │    ├── SoapNote* / ClinicalSummary* / DoctorNote
      │    └── Prescription*
      ├── CarePlan / TreatmentPlan
      ├── LabResult / ImagingReport (DiagnosticResult)
      ├── ClinicalDocument / PatientUpload (attachments)
      ├── ConsentEvent
      └── EmrTimelineEvent*
```

\* versioned or release-gated as specified.

---

## Existing models (reuse / extend)

| Model | EMR use | Planned extensions |
|-------|---------|-------------------|
| `MedicalProfile` | Legacy bag | Migrate fields into typed history tables; keep as read-compat or deprecate after backfill |
| `SoapNote` | Encounter SOAP | Ensure soft-delete/dismiss already covered; timeline hooks |
| `ClinicalSummary` | Visit summary | Timeline hooks |
| `Prescription` + `PrescriptionLine` | Meds | Add `renewedFromId`, soft-delete, clearer DRAFT vs ACTIVE vs EXPIRED |
| `LabResult` | Labs | Imaging kind discriminator or sibling `ImagingReport`; soft-delete |
| `ClinicalDocument` | Files | `classification`, `deletedAt`, `legalHold`, immutability flag |
| `MedicalRecord` | Generic record entries | Map to timeline; optional link to diagnosis/encounter |
| `PatientUpload` | Patient files | Classification + soft-delete + chart visibility |
| `Appointment` | Visits | Timeline source for visit/appointment history |
| `LabReviewAcknowledgement` | Doctor review | Keep |

---

## New / normalized entities

### AllergyEntry

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| patientUserId | string | FK User |
| substance | string | |
| reaction | string? | |
| severity | enum? | MILD/MODERATE/SEVERE/CRITICAL |
| source | enum | PATIENT_REPORTED \| CLINICIAN_ATTESTED |
| criticalFlag | boolean | emergency banner |
| recordedByUserId | string | |
| deletedAt | DateTime? | soft-delete |
| createdAt / updatedAt | DateTime | |

**Validation**: substance required; clinician-attested preferred for Rx safety checks when both exist.

### ConditionEntry (chronic / problem list)

| Field | Notes |
|-------|-------|
| id, patientUserId | |
| display | required |
| icd10Code | optional |
| status | ACTIVE \| RESOLVED \| INACTIVE |
| source | PATIENT_REPORTED \| CLINICIAN_ATTESTED |
| onsetDate | optional |
| deletedAt | soft-delete |

### ImmunizationEntry

| Field | Notes |
|-------|-------|
| vaccineName, administeredOn, source, lotNumber?, deletedAt | |

### FamilyHistoryEntry / LifestyleProfile / EmergencyInfo

- **FamilyHistoryEntry**: relation, conditionDisplay, notes, source, deletedAt  
- **LifestyleProfile**: 1:1 patient — smoking, alcohol, activity, other JSON/text fields per Stitch  
- **EmergencyInfo**: 1:1 — contacts, critical free-text alerts; patient-editable contacts; clinician critical flags audited  

### Diagnosis

| Field | Notes |
|-------|-------|
| id, patientUserId, encounterId?/appointmentId? | |
| display | required |
| icd10Code | optional ICD-10 / ICD-10-CM |
| status | ACTIVE \| HISTORICAL |
| recordedByUserId, recordedAt | |
| deletedAt | |

### DoctorNote

Optional free-form clinician note when not SOAP (if Stitch distinguishes). Fields: appointmentId?, patientUserId, body, status DRAFT|SIGNED, versioning like SOAP.

### CarePlan / TreatmentPlan

| Field | Notes |
|-------|-------|
| id, patientUserId, title, status | DRAFT \| ACTIVE \| COMPLETED \| CANCELLED |
| goals / interventions | JSON or child rows |
| version, parentPlanId, signedAt? | version on clinically material publish |
| deletedAt | |

### ConsentType / ConsentTextVersion / ConsentEvent

- **ConsentType**: code (e.g. TELEMEDICINE, TREATMENT), nameEn/Ar  
- **ConsentTextVersion**: typeId, version, locale, bodyHash/body, effectiveAt  
- **ConsentEvent**: patientUserId, textVersionId, kind ACKNOWLEDGE|WITHDRAW, actorUserId, at, evidenceDocumentId?  

**Rule**: Withdraw does not delete prior ACKNOWLEDGE.

### EmrTimelineEvent

| Field | Notes |
|-------|-------|
| id | |
| patientUserId | indexed |
| type | ENCOUNTER \| APPOINTMENT \| PRESCRIPTION \| LAB \| IMAGING \| DOCUMENT \| CONSENT \| DIAGNOSIS \| PLAN \| NOTE \| SYSTEM |
| effectiveAt | sort key |
| actorUserId? | |
| refType / refId | polymorphic pointer |
| visibility | PATIENT \| CLINICIAN \| ADMIN \| ALL_AUTHORIZED |
| status | ACTIVE \| SUPERSEDED \| HIDDEN |
| title / summary | role-safe snippets (no full PHI dump required) |
| createdAt | |

**Uniqueness**: optional `@@unique([refType, refId, type])` for idempotent upsert on write.

### Prescription renewal

Add to `Prescription`:

- `renewedFromId String?` → self-FK  
- `draft` lifecycle already via status; ensure signed rows immutable  

---

## Soft-delete & legal hold

Common pattern on chart items:

- `deletedAt DateTime?`  
- `deletedByUserId String?`  
- `legalHold Boolean @default(false)` on documents/uploads  

Queries for default UX: `deletedAt == null`. Admin/compliance may include deleted when hold/policy requires.

---

## State transitions (summary)

### SOAP / ClinicalSummary / signed DoctorNote

`DRAFT` → `SIGNED` (finalize); amendment → new row `SIGNED` with `parent*` + reason; optional `DISMISSED` for unsigned pending.

### Prescription

`DRAFT` → `ACTIVE` (sign); → `EXPIRED`/`CANCELLED` by rules; renewal creates new `DRAFT`/`ACTIVE` with `renewedFromId`.

### LabResult

`PENDING_REVIEW` → release to patient (`RELEASED`); `PRELIMINARY`/`FINAL` phase; `RETRACTED`/`SUPERSEDED` via status + `supersededById`.

### Consent

ACKNOWLEDGE event; later WITHDRAW event; gating reads latest effective state per type.

### Timeline

ACTIVE → SUPERSEDED/HIDDEN on correction; compensating event appended.

---

## Relationships (ER sketch)

```text
User 1──* AllergyEntry
User 1──* ConditionEntry
User 1──* Diagnosis
User 1──* CarePlan
User 1──* ConsentEvent
User 1──* EmrTimelineEvent
Appointment 1──* SoapNote
Appointment 1──* Prescription
Prescription 1──* PrescriptionLine
Prescription *──? Prescription (renewedFrom)
LabResult *──? ClinicalDocument
ClinicalDocument 1──* (linked records)
ConsentTextVersion *──* ConsentEvent
```

---

## Validation rules (domain)

- Patient cannot mutate clinician-attested or signed rows.  
- Doctor requires care relationship for PHI.  
- Admin cannot SIGN prescriptions/SOAP.  
- ICD-10 code format validated loosely when present (letter + digits pattern); display always required.  
- Attachment size/type via Platform limits.  
- Consent withdraw requires authenticated patient (or admin ops path if Stitch provides — default patient self).  

---

## Migration notes

1. Add new tables + columns (non-breaking).  
2. Backfill Allergy/Condition from `MedicalProfile` string arrays as PATIENT_REPORTED.  
3. Backfill timeline from appointments, signed notes, Rx, released labs, documents.  
4. Keep `MedicalProfile` until facades fully cut over.
