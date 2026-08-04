# Contract: EMR Server Actions / Facades

**Feature**: `007-electronic-medical-records`  
**Date**: 2026-08-04  
**Transport**: Next.js Server Actions (`src/actions/emr/*`) calling `src/lib/emr/*`  
**Validation**: Zod  
**Outcomes**: Platform outcome taxonomy (`ok` + `code`)

## Conventions

- All actions require authenticated session unless noted.  
- Every patient-scoped call includes implicit/explicit `patientUserId` subject to `assertEmrAccess`.  
- Errors: `UNAUTHORIZED` | `FORBIDDEN` | `NOT_FOUND` | `VALIDATION_ERROR` | `CONFLICT` | `DEPENDENCY_UNAVAILABLE` | `INTERNAL_FAILURE`.  
- No public unauthenticated EMR REST API in v1.

---

## Access

### `emrAssertAccess`

| Input | Output |
|-------|--------|
| `{ patientUserId, action: "read"\|"write_clinical"\|"write_self"\|"sign"\|"admin_oversight"\|"download" }` | `{ ok: true }` or fail |

---

## Summary & history

### `emrGetSummary`

| Input | Output |
|-------|--------|
| `{ patientUserId }` | Summary DTO: demographics (allowed), allergies, conditions, activeMeds[], recentEncounters[], emergency, criticalFlags[] |

### `emrListAllergies` / `emrUpsertAllergy` / `emrSoftDeleteAllergy`

- Upsert enforces source rules (patient → PATIENT_REPORTED only).

### `emrGetLifestyle` / `emrUpdateLifestyle`

### `emrGetEmergencyInfo` / `emrUpdateEmergencyInfo`

### `emrListImmunizations` / `emrUpsertImmunization`

### `emrListFamilyHistory` / `emrUpsertFamilyHistoryEntry`

---

## Diagnoses & encounters

### `emrListDiagnoses`

| Input | Output |
|-------|--------|
| `{ patientUserId, q?, status?, page? }` | paginated diagnoses (icd10Code optional) |

### `emrUpsertDiagnosis` (doctor write_clinical)

### `emrListEncounters`

Links appointments + documentation completeness flags.

---

## Notes (SOAP / summary)

### `emrGetSoap` / `emrSaveSoapDraft` / `emrSignSoap` / `emrAmendSoap`

Mirrors Doctor Portal rules; EMR facade is canonical going forward.

### `emrGetClinicalSummary` / `emrSaveSummaryDraft` / `emrSignSummary` / `emrAmendSummary`

---

## Plans

### `emrListPlans` / `emrUpsertPlan` / `emrPublishPlanVersion`

---

## Prescriptions

### `emrListPrescriptions`

| Input | `{ patientUserId, bucket: "active"\|"history"\|"all", page? }` |

### `emrCreatePrescriptionDraft` / `emrSignPrescription` / `emrRenewPrescription`

Renew: `{ fromPrescriptionId }` → new draft/signed order with `renewedFromId`.

Patient callers: list only (FORBIDDEN on create/sign/renew).

---

## Diagnostics

### `emrListLabResults` / `emrListImagingReports`

Doctor: Preliminary+Final; Patient: Released only.

### `emrReleaseLabToPatient` / `emrRetractLab` (doctor/admin-as-ops if designed)

### `emrAckLabReview` (doctor)

---

## Documents & attachments

### `emrListDocuments`

### `emrRegisterAttachment` (after Platform upload)

### `emrSoftDeleteDocument` / `emrRestoreDocument`

### `emrGetDownloadUrl` → Platform download + EMR audit

---

## Consents

### `emrListConsentState`

### `emrAcknowledgeConsent` `{ typeCode, textVersionId }`

### `emrWithdrawConsent` `{ typeCode }`

### `emrAssertConsent` `{ typeCode }` → ok or FORBIDDEN for gating callers

---

## Timeline

### `emrListTimeline`

| Input | `{ patientUserId, types?, from?, to?, cursor?, limit? }` |
| Output | `{ items: TimelineItem[], nextCursor? }` |

`TimelineItem`: `{ id, type, effectiveAt, title, refType, refId, status }`

---

## Admin

### `emrAdminGetChartOversight`

### `emrAdminExportChartPackage` (audited; optional)

### `emrAdminSetLegalHold` `{ documentId, hold: boolean }`

Admin `sign` actions always FORBIDDEN.

---

## Events → Timeline (write side-effect contract)

| Domain mutation | Timeline type |
|-----------------|---------------|
| Appointment status material | APPOINTMENT |
| SOAP/Summary signed | NOTE |
| Prescription signed/renewed | PRESCRIPTION |
| Lab released/retracted | LAB |
| Imaging report available | IMAGING |
| Document available/hidden | DOCUMENT |
| Consent ack/withdraw | CONSENT |
| Diagnosis recorded | DIAGNOSIS |
| Plan published | PLAN |
