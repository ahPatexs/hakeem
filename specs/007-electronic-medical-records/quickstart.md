# Quickstart: EMR Validation

**Feature**: `007-electronic-medical-records`  
**Date**: 2026-08-04

Validate Module 6 EMR end-to-end after implement. This is a **run guide**, not implementation.

## Prerequisites

- Neon DB migrated (EMR models from [data-model.md](./data-model.md))
- Auth seed users: Patient, Doctor (care relationship), Admin
- Platform file/audit working
- `pnpm` / `npm` install; `npx prisma migrate deploy`; `npx prisma db seed` if available

## Local run

```bash
npm run dev
# or: pnpm dev
```

Open `http://localhost:3000/{locale}/…` for patient/doctor/admin EMR routes.

## Scenario checklist

### 1. Patient summary (SC-001)

1. Sign in as Patient.  
2. Open Medical Record / Summary.  
3. Confirm allergies, active meds, timeline entry points visible within ~1 minute.  
4. Switch `en` ↔ `ar`; confirm RTL.

### 2. RBAC denials (SC-003)

1. As Patient A, attempt Patient B chart URL/id → denied, audited.  
2. As Doctor without care relationship → denied.  
3. As Doctor with relationship → summary loads; audit chart open.

### 3. SOAP versioning (SC-004)

1. Doctor drafts SOAP → save.  
2. Sign with Assessment+Plan → read-only.  
3. Amend with reason → new version; prior immutable.

### 4. Lab release (SC-005)

1. Seed Preliminary lab → Doctor sees; Patient does not.  
2. Release to patient → Patient sees Final/Preliminary label.  
3. Retract → Patient current list clears; timeline explains.

### 5. Prescription renewal (SC-006)

1. Doctor signs Rx → Patient Active list.  
2. Doctor renews → new order linked; prior unchanged.  
3. Patient renew attempt → FORBIDDEN.

### 6. Timeline integrity (SC-007, SC-018)

1. Seed encounter + Rx + released lab.  
2. Timeline chronological; filter by type.  
3. Retract lab → compensating/status event present.

### 7. Soft-delete attachment (SC-016)

1. Upload document → visible.  
2. Soft-delete → hidden from patient default list.  
3. Admin/compliance can still resolve if hold/policy; no hard-delete control.

### 8. Consent (SC-014)

1. Patient acknowledges consent version.  
2. Withdraw → original ack retained; gated action fails until re-consent.

### 9. Admin oversight (SC-013)

1. Admin opens oversight chart (if routed).  
2. Attempt sign SOAP/Rx as Admin → denied.  
3. Export (if enabled) → audited.

### 10. Search isolation (SC-017)

1. Patient search inside own chart works.  
2. Queries that would target another patient return safe empty/denial — no PHI leak.

### 11. Accessibility smoke (SC-010)

1. Keyboard-only: reach allergy/critical alert and one primary action.  
2. Screen-reader name present on alert region.

## Retention & legal hold (FR-044 / T104)

- Soft-deleted clinical documents remain in the database (`deletedAt` set); they are excluded from default patient/doctor lists.
- `legalHold: true` blocks soft-delete and content replacement; only Admin oversight (`setLegalHold`) may toggle hold.
- Hard deletion of PHI is out of scope for Module 6 — retention schedules are operational (backup/export policy), not product hard-delete.
- Timeline compensating events (`HIDDEN` / `SUPERSEDED`) preserve explainable history when labs retract or documents are hidden.
- Run historical projection backfill: `npx tsx scripts/emr-backfill-timeline.ts [patientUserId]`.

## Automated tests (when implemented)

```bash
npx vitest run tests/unit/emr tests/integration/emr
npx playwright test tests/e2e/emr
```

## References

- [contracts/emr-api.md](./contracts/emr-api.md)  
- [data-model.md](./data-model.md)  
- [ui-review.md](./ui-review.md)  
- [plan.md](./plan.md)
