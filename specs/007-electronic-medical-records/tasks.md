# Tasks: Electronic Medical Records (EMR)

**Input**: Design documents from `/specs/007-electronic-medical-records/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [ui-review.md](./ui-review.md), [quickstart.md](./quickstart.md)

**Tests**: Included â€” unit, integration, security, accessibility, and performance (user-requested).

**UI gate**: Do **not** redesign. Stitch + existing Patient/Doctor design packs are SoT. Build under `src/components/emr/*`; portals mount shared EMR components.

**Organization** (user categories â†’ phases):

| Category | Phases / stories |
|----------|------------------|
| Foundation (EMR module, DB models, shared clinical components) | Phase 1â€“2 |
| Patient Records (summary, history, allergies, conditions, family, immunizations) | US1â€“US2 |
| Clinical Records (encounters, diagnoses, SOAP, doctor notes, treatment plans) | US3â€“US4 |
| Medications (active, history, renewals) | US5 |
| Laboratory (labs, reports, imaging) | US6 |
| Documents (upload, certificates, referrals, consent) | US7 |
| Timeline (medical, visit, appointment history) | US8 |
| Infrastructure (audit, search, version history, file storage) | Phase 2 + US8 hooks + Polish |
| Admin oversight | US9 |
| Localization / accessibility | US10 |
| Testing | Per-story tests + Polish |
| Definition of Done | Polish checklist |

**Definition of Done** (validate in Polish): Complete longitudinal EMR; secure RBAC; audit logging; records reusable across Patient/Doctor/Admin via EMR facades; production-ready per [quickstart.md](./quickstart.md).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable (different files, no incomplete deps)
- **[Story]**: [US1]â€“[US10] for story phases only

## Path Conventions

Single Next.js app: `src/`, `prisma/`, `tests/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: EMR folder skeleton, i18n namespace, test harness, design placeholder

- [x] T001 Create folder skeleton per [plan.md](./plan.md): `src/domain/emr/`, `src/lib/emr/`, `src/components/emr/{summary,timeline,history,diagnoses,soap,prescriptions,labs,imaging,documents}/`, `src/hooks/emr/`, `src/actions/emr/`
- [x] T002 [P] Add `emr.*` message namespaces to `src/i18n/messages/en.json` and `src/i18n/messages/ar.json` (summary, timeline, allergies, empty/error, consent, renewals)
- [x] T003 [P] Create test folders `tests/unit/emr/`, `tests/integration/emr/`, `tests/security/emr/`, `tests/a11y/emr/`, `tests/perf/emr/`, `tests/e2e/emr/`
- [x] T004 [P] Confirm/update `specs/007-electronic-medical-records/design/manifest.json` surface list from [ui-review.md](./ui-review.md); note Stitch export blocked until auth works
- [x] T005 [P] Add EMR barrel stubs `src/components/emr/index.ts` and `src/lib/emr/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database models, RBAC access, versioning, soft-delete, shared clinical chrome, audit helper â€” MUST complete before user stories

**âš ï¸ CRITICAL**: No user story work until this phase completes

### Database models

- [x] T006 Extend `prisma/schema.prisma` per [data-model.md](./data-model.md): `AllergyEntry`, `ConditionEntry`, `ImmunizationEntry`, `FamilyHistoryEntry`, `LifestyleProfile`, `EmergencyInfo`, `Diagnosis`, `CarePlan`/`TreatmentPlan` (or unified Plan), consent tables, `EmrTimelineEvent`; extend `Prescription.renewedFromId`, soft-delete/`legalHold` on documents/uploads; create migration under `prisma/migrations/`
- [x] T007 [P] Backfill seed helpers in `prisma/seed.ts` for sample allergies/conditions/timeline events for local EMR testing
- [x] T008 Run `prisma migrate` / `prisma generate` and fix any relation compile errors in existing Patient/Doctor code touching extended models

### Domain core (RBAC, versioning, soft-delete, release)

- [x] T009 Implement `assertEmrAccess` RBAC matrix in `src/domain/emr/access.ts` (Patient/Doctor+care relationship/Admin) per FR-036
- [x] T010 [P] Implement clinical versioning helpers in `src/domain/emr/versioning.ts` (sign/amend/renew immutability rules) per FR-039
- [x] T011 [P] Implement soft-delete helpers in `src/domain/emr/soft-delete.ts` per FR-041
- [x] T012 [P] Implement diagnostic release visibility rules in `src/domain/emr/release.ts` per FR-013
- [x] T013 [P] Implement consent domain rules in `src/domain/emr/consent.ts` per FR-045
- [x] T014 Implement timeline event mapping/ordering integrity in `src/domain/emr/timeline.ts` per FR-043
- [x] T015 [P] Wire EMR audit emitter wrapper in `src/lib/emr/audit.ts` calling `src/lib/platform/audit.ts` with EMR action types per FR-040

### Shared clinical components / hooks

- [x] T016 [P] Add EMR loading/empty/error re-exports or thin wrappers in `src/components/emr/` from `src/components/platform/` (no redesign) per [contracts/ui.md](./contracts/ui.md)
- [x] T017 [P] Create React Query hook stubs `src/hooks/emr/use-emr-timeline.ts`, `use-emr-labs.ts`, `use-emr-prescriptions.ts`
- [x] T018 [P] Add critical-alert banner primitive `src/components/emr/critical-alerts.tsx` (allergy/critical flags; accessible name + non-color cue)

**Checkpoint**: Foundation ready â€” user story implementation can begin

---

## Phase 3: User Story 1 â€” Patient Summary & Core Chart (Priority: P1) ðŸŽ¯ MVP

**Goal**: Authorized users open EMR summary with allergies, conditions, active meds, recent encounters, emergency/critical alerts (Stitch-aligned).

**Independent Test**: Patient self-summary; doctor with relationship sees clinician summary + alerts; unauthorized denied + audited ([quickstart.md](./quickstart.md) Â§1â€“2).

### Tests for User Story 1

- [x] T019 [P] [US1] Unit test `assertEmrAccess` matrix in `tests/unit/emr/access.test.ts`
- [x] T020 [P] [US1] Unit test summary DTO assembly rules in `tests/unit/emr/summary.test.ts`
- [x] T021 [P] [US1] Security test cross-patient denial in `tests/security/emr/rbac.test.ts`

### Implementation for User Story 1

- [x] T022 [P] [US1] Implement facade `src/lib/emr/summary.ts` (`emrGetSummary`) per [contracts/emr-api.md](./contracts/emr-api.md)
- [x] T023 [US1] Implement Server Actions in `src/actions/emr/summary.ts` (Zod-validated)
- [x] T024 [P] [US1] Build Stitch-aligned summary UI in `src/components/emr/summary/` (mount critical alerts)
- [x] T025 [US1] Wire Patient medical-record/summary route to EMR summary component under `src/app/[locale]/patient/`
- [x] T026 [US1] Wire Doctor patient overview to EMR summary under `src/app/[locale]/doctor/patients/[id]/` (or equivalent)
- [x] T027 [US1] Emit chart-open audit from summary facade

**Checkpoint**: MVP summary usable for Patient + Doctor

---

## Phase 4: User Story 2 â€” Patient-Reported Medical Profile (Priority: P1)

**Goal**: Patient maintains lifestyle, family history, emergency info, patient-asserted allergies/conditions; clinician-attested remains read-only; sources labeled.

**Independent Test**: Patient edits lifestyle/emergency; cannot edit signed clinician diagnosis; doctor sees source labels.

### Tests for User Story 2

- [x] T028 [P] [US2] Unit test patient vs clinician source mutation rules in `tests/unit/emr/history.test.ts`
- [x] T029 [P] [US2] Integration test allergy upsert + soft-delete in `tests/integration/emr/history.test.ts`

### Implementation for User Story 2

- [x] T030 [P] [US2] Implement facade `src/lib/emr/history.ts` (allergies, conditions, immunizations, family, lifestyle, emergency)
- [x] T031 [US2] Implement Server Actions in `src/actions/emr/history.ts`
- [x] T032 [P] [US2] Build history UI sections in `src/components/emr/history/` (Stitch; source badges)
- [x] T033 [US2] Migrate Patient medical-profile page to EMR history facade from `src/actions/patient/medical-profile.ts` / `src/app/[locale]/patient/medical-profile/`
- [x] T034 [US2] Backfill `MedicalProfile` string arrays â†’ typed entries migration script or one-time seed path documented in `prisma/seed.ts`
- [x] T035 [US2] Ensure clinician-attested write paths exist for doctors (allergies/conditions/immunizations) with audit

**Checkpoint**: Patient records domains editable under rules

---

## Phase 5: User Story 3 â€” Encounters, Diagnoses & Documentation (Priority: P1)

**Goal**: Doctor documents encounters with diagnoses, SOAP, doctor notes; draftâ†’signâ†’amend versioning.

**Independent Test**: Draft/sign SOAP; amend creates version; patient cannot see drafts ([quickstart.md](./quickstart.md) Â§3).

### Tests for User Story 3

- [x] T036 [P] [US3] Unit test SOAP sign/amend immutability in `tests/unit/emr/versioning.test.ts`
- [x] T037 [P] [US3] Integration test SOAP sign + audit in `tests/integration/emr/notes.test.ts`
- [x] T038 [P] [US3] Unit test ICD-10 optional diagnosis validation in `tests/unit/emr/diagnoses.test.ts`

### Implementation for User Story 3

- [x] T039 [P] [US3] Implement facade `src/lib/emr/encounters.ts` and `src/lib/emr/diagnoses.ts`
- [x] T040 [US3] Implement/canonicalize notes facade `src/lib/emr/notes.ts` wrapping existing `SoapNote`/`ClinicalSummary` flows
- [x] T041 [US3] Implement Server Actions `src/actions/emr/encounters.ts`, `diagnoses.ts`, `notes.ts`
- [x] T042 [P] [US3] Build diagnoses UI with optional ICD-10 combobox in `src/components/emr/diagnoses/`
- [x] T043 [P] [US3] Promote/align SOAP UI under `src/components/emr/soap/` from doctor consultation components (no redesign)
- [x] T044 [US3] Add DoctorNote support (model if needed + UI) under `src/components/emr/soap/` or `notes/`
- [x] T045 [US3] Migrate Doctor consultation workspace to EMR notes/diagnoses facades under `src/app/[locale]/doctor/consultations/`
- [x] T046 [US3] Upsert `EmrTimelineEvent` on SOAP/summary sign and diagnosis write via `src/lib/emr/timeline.ts`

**Checkpoint**: Clinical documentation versioned and authorized

---

## Phase 6: User Story 4 â€” Treatment & Care Plans (Priority: P2)

**Goal**: Clinicians create/update longitudinal treatment/care plans with versioned material publishes.

**Independent Test**: Create plan with goals; update status; unauthorized denied.

### Tests for User Story 4

- [x] T047 [P] [US4] Unit test plan publish versioning in `tests/unit/emr/plans.test.ts`
- [x] T048 [P] [US4] Integration test plan CRUD + timeline event in `tests/integration/emr/plans.test.ts`

### Implementation for User Story 4

- [x] T049 [US4] Implement facade `src/lib/emr/plans.ts` and actions `src/actions/emr/plans.ts`
- [x] T050 [P] [US4] Build plans UI in `src/components/emr/` (Stitch-aligned section; reuse list chrome)
- [x] T051 [US4] Mount plans on Doctor chart and patient-visible released view when designed
- [x] T052 [US4] Emit timeline PLAN events on publish

**Checkpoint**: Plans available longitudinally

---

## Phase 7: User Story 5 â€” Prescriptions, History & Renewals (Priority: P1)

**Goal**: Active vs history Rx; doctor create/sign; allergy warnings; doctor-initiated renewals; patients read-only.

**Independent Test**: Sign Rx; patient sees active; renew links prior; patient renew FORBIDDEN ([quickstart.md](./quickstart.md) Â§5).

### Tests for User Story 5

- [x] T053 [P] [US5] Unit test renewal creates new order without mutating prior in `tests/unit/emr/prescriptions.test.ts`
- [x] T054 [P] [US5] Security test patient cannot sign/renew in `tests/security/emr/prescriptions.test.ts`
- [x] T055 [P] [US5] Integration test sign + allergy ack path in `tests/integration/emr/prescriptions.test.ts`

### Implementation for User Story 5

- [x] T056 [US5] Implement facade `src/lib/emr/prescriptions.ts` (list active/history, draft, sign, renew) using Platform safety check where applicable
- [x] T057 [US5] Implement Server Actions `src/actions/emr/prescriptions.ts`
- [x] T058 [P] [US5] Align Rx UI under `src/components/emr/prescriptions/` (create/review/sign + renew CTA per ui-review G3)
- [x] T059 [US5] Migrate Doctor prescription flows to EMR facade from `src/actions/doctor/prescriptions.ts`
- [x] T060 [US5] Migrate Patient prescriptions views to EMR list facade
- [x] T061 [US5] Emit timeline PRESCRIPTION events; audit sign/renew

**Checkpoint**: Medications reusable via EMR

---

## Phase 8: User Story 6 â€” Laboratory, Imaging & Diagnostic Reports (Priority: P1)

**Goal**: Role-based lab/imaging/report visibility; critical banners; release/retract; doctor review ack.

**Independent Test**: Preliminary doctor-only; release to patient; retract clears patient current ([quickstart.md](./quickstart.md) Â§4).

### Tests for User Story 6

- [x] T062 [P] [US6] Unit test release visibility matrix in `tests/unit/emr/release.test.ts`
- [x] T063 [P] [US6] Integration test release/retract + timeline compensation in `tests/integration/emr/diagnostics.test.ts`
- [x] T064 [P] [US6] Security test patient cannot see unreleased labs in `tests/security/emr/labs.test.ts`

### Implementation for User Story 6

- [x] T065 [US6] Implement facade `src/lib/emr/diagnostics.ts` (labs, imaging, reports, release, retract, ack)
- [x] T066 [US6] Implement Server Actions `src/actions/emr/diagnostics.ts`
- [x] T067 [P] [US6] Build labs UI in `src/components/emr/labs/` from Stitch labs/radiology pack
- [x] T068 [P] [US6] Build imaging UI in `src/components/emr/imaging/` (same design language as labs)
- [x] T069 [US6] Migrate Patient/Doctor lab routes to EMR diagnostics facade
- [x] T070 [US6] Upsert timeline LAB/IMAGING events; criticalFlag surfaces via `critical-alerts`

**Checkpoint**: Diagnostics release-safe

---

## Phase 9: User Story 7 â€” Medical Documents & Consent Forms (Priority: P2)

**Goal**: Uploads, referrals, certificates, consents; Platform storage/scan; soft-delete; immutable signed docs; consent ack/withdraw.

**Independent Test**: Upload screened; soft-delete hides; consent withdraw retains ack ([quickstart.md](./quickstart.md) Â§7â€“8).

### Tests for User Story 7

- [x] T071 [P] [US7] Unit test consent ack/withdraw append-only in `tests/unit/emr/consent.test.ts`
- [x] T072 [P] [US7] Integration test upload register + soft-delete in `tests/integration/emr/documents.test.ts`
- [x] T073 [P] [US7] Security test cross-patient document denial in `tests/security/emr/documents.test.ts`

### Implementation for User Story 7

- [x] T074 [US7] Implement facade `src/lib/emr/documents.ts` (list, register attachment via Platform, soft-delete/restore, download URL)
- [x] T075 [US7] Implement facade `src/lib/emr/consents.ts` + seed ConsentType/TextVersion
- [x] T076 [US7] Implement Server Actions `src/actions/emr/documents.ts`, `consents.ts`
- [x] T077 [P] [US7] Build documents UI in `src/components/emr/documents/` (upload + classifications)
- [x] T078 [P] [US7] Build consent ack/withdraw UI (dialog pattern per ui-review G1) under `src/components/emr/documents/consent-*.tsx`
- [x] T079 [US7] Migrate patient uploads / clinical document list views to EMR documents facade
- [x] T080 [US7] Enforce signed-document immutability via Platform `replaceClinicalDocumentContent` / EMR guards
- [x] T081 [US7] Emit timeline DOCUMENT/CONSENT events; audit downloads

**Checkpoint**: Documents + consents production-ready path

---

## Phase 10: User Story 8 â€” Longitudinal Medical Timeline (Priority: P1)

**Goal**: Unified timeline with filters; visit/appointment facets consistent; compensating events on corrections.

**Independent Test**: Seeded encounter+Rx+lab ordered; filter works; retract leaves explainable history ([quickstart.md](./quickstart.md) Â§6).

### Tests for User Story 8

- [x] T082 [P] [US8] Unit test timeline ordering + compensating events in `tests/unit/emr/timeline.test.ts`
- [x] T083 [P] [US8] Integration test `emrListTimeline` RBAC visibility in `tests/integration/emr/timeline.test.ts`
- [x] T084 [P] [US8] Perf smoke timeline window on seeded 500 events in `tests/perf/emr/timeline.perf.test.ts`

### Implementation for User Story 8

- [x] T085 [US8] Complete facade `src/lib/emr/timeline.ts` (`listTimeline`, `upsertTimelineEvent`, backfill helper)
- [x] T086 [US8] Implement Server Actions `src/actions/emr/timeline.ts`
- [x] T087 [P] [US8] Build timeline UI in `src/components/emr/timeline/` matching `d-medical-timeline.png` (filters, empty state)
- [x] T088 [US8] Wire Patient + Doctor timeline routes; appointment/visit history as filtered facets
- [x] T089 [US8] Add backfill job or script to materialize historical `EmrTimelineEvent` from appointments/notes/rx/labs/docs
- [x] T090 [US8] Implement in-chart search/filter helpers in `src/lib/emr/search.ts` (q/status/type/date, page size 20) per FR-048; wire to timeline/docs/labs lists

**Checkpoint**: Timeline is longitudinal SoT projection

---

## Phase 11: User Story 9 â€” Administrator Oversight (Priority: P2)

**Goal**: Admin read/oversight chart; export/hold when designed; cannot sign clinical artifacts.

**Independent Test**: Admin opens oversight; sign SOAP/Rx denied; export audited if enabled ([quickstart.md](./quickstart.md) Â§9).

### Tests for User Story 9

- [x] T091 [P] [US9] Security test admin cannot sign Rx/SOAP in `tests/security/emr/admin.test.ts`
- [x] T092 [P] [US9] Integration test admin oversight read + audit in `tests/integration/emr/admin.test.ts`

### Implementation for User Story 9

- [x] T093 [US9] Implement facade `src/lib/emr/admin.ts` (oversight summary, legal hold, optional export)
- [x] T094 [US9] Implement Server Actions `src/actions/emr/admin.ts`
- [x] T095 [P] [US9] Admin oversight UI (reuse summary/timeline + admin banner) under `src/components/emr/` / `src/app/[locale]/admin/` per ui-review G2
- [x] T096 [US9] Cross-patient admin directory search (audited) limited to Admin role in `src/lib/emr/search.ts`

**Checkpoint**: Admin compliance path without clinical authorship

---

## Phase 12: User Story 10 â€” Localized & Accessible EMR Surfaces (Priority: P1)

**Goal**: EN/AR + RTL; keyboard-accessible primary flows and critical alerts.

**Independent Test**: Locale switch on summary/timeline; keyboard reaches alert + primary action ([quickstart.md](./quickstart.md) Â§11).

### Tests for User Story 10

- [x] T097 [P] [US10] Accessibility checks for critical-alert and summary primary actions in `tests/a11y/emr/summary.a11y.test.ts`
- [x] T098 [P] [US10] Verify `emr.*` keys exist for en/ar for primary surfaces in `tests/unit/emr/i18n-keys.test.ts`

### Implementation for User Story 10

- [x] T099 [US10] Audit all EMR components for `useTranslations('emr.*')` and RTL-safe layout classes
- [x] T100 [US10] Ensure empty/loading/error states use localized copy and `role="alert"` / `aria-busy` where appropriate
- [x] T101 [US10] Keyboard focus order pass on summary, timeline filters, Rx review/sign, consent dialogs

**Checkpoint**: Bilingual accessible EMR chrome

---

## Phase 13: Polish & Cross-Cutting (Infrastructure + DoD)

**Purpose**: Consumer migration, AI context gate, retention notes, Stitch export retry, full test gates, production readiness

### Consumer migration & reuse

- [x] T102 Migrate remaining Patient/Doctor clinical reads/writes to EMR facades so portals do not maintain divergent chart logic (FR-033)
- [x] T103 [P] Expose authorized structured chart context helper `src/lib/emr/ai-context.ts` for Platform AI (no silent writes/sign)
- [x] T104 [P] Document retention/legal-hold ops notes in `specs/007-electronic-medical-records/quickstart.md` or `research.md` addendum (FR-044)

### File storage / version history polish

- [x] T105 Verify all EMR downloads use Platform HTTPS short-lived URLs + EMR access assert in `src/lib/emr/documents.ts`
- [x] T106 [P] Add version-history list UI for SOAP/Rx/plans where Stitch allows (read prior versions) under `src/components/emr/`

### Search polish

- [x] T107 Ensure list search cannot bypass RBAC/release (defense-in-depth tests already in security suite); fix any gaps in `src/lib/emr/search.ts`

### Stitch / design

- [ ] T108 When Stitch MCP auth works, export EMR screens into `specs/007-electronic-medical-records/design/` and set manifest `exported: true`; resolve ui-review gaps G1â€“G6 against live frames

### Testing gates (aggregate)

- [x] T109 [P] Expand unit suite coverage for soft-delete and timeline integrity in `tests/unit/emr/`
- [x] T110 [P] Expand integration suite for end-to-end chart writeâ†’timelineâ†’read in `tests/integration/emr/`
- [x] T111 [P] Security suite: enumeration-safe errors, admin deny-sign, patient deny-unreleased in `tests/security/emr/`
- [x] T112 [P] Accessibility suite for timeline filters + consent dialogs in `tests/a11y/emr/`
- [x] T113 [P] Performance: summary widget isolation + timeline cursor p95 smoke in `tests/perf/emr/`
- [x] T114 Add Playwright smoke paths in `tests/e2e/emr/` for patient summary, doctor SOAP sign, lab release visibility

### Definition of Done checklist

- [x] T115 Verify complete longitudinal EMR (summaryâ†’historyâ†’clinicalâ†’medsâ†’labsâ†’docsâ†’timeline) against [quickstart.md](./quickstart.md)
- [x] T116 Verify RBAC enforced on every facade entry (`assertEmrAccess`)
- [x] T117 Verify audit events for view/download/sign/amend/renew/consent/soft-delete/admin
- [x] T118 Verify Patient/Doctor/Admin consume EMR facades (no parallel clinical stacks for covered domains)
- [x] T119 Production readiness: migrations applied, seed path works, EN/AR strings present, no redesign regressions vs Stitch packs

---

## Dependencies & Story Order

```text
Phase 1 Setup
    â†“
Phase 2 Foundational (schema, access, versioning, soft-delete, shared chrome, audit)
    â†“
US1 Summary (MVP) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
    â†“                                                      â”‚
US2 Patient history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
    â†“                                                      â”‚
US3 Encounters / Diagnoses / SOAP â”€â”€â”¬â”€â”€ US5 Prescriptions â”€â”¼â”€â”€ US6 Labs
    â†“                               â”‚                      â”‚
US4 Plans (P2)                      â”‚                      â”‚
                                    â†“                      â†“
                              US7 Documents/Consent â†â”€â”€â”€â”€â”€â”€â”˜
                                    â†“
                              US8 Timeline (+ search)
                                    â†“
                              US9 Admin (P2)
                                    â†“
                              US10 i18n/a11y
                                    â†“
                              Phase 13 Polish + DoD
```

**Parallel opportunities after Phase 2**:
- US1 and domain unit tests for access/versioning can proceed immediately
- After US1: US2 parallelizable with early US3 model work if files don't conflict
- After US3 notes stable: US5 and US6 can proceed in parallel (different facades/UI folders)
- US4 (P2) can follow US3 without blocking US5/US6
- US7 can start once Platform document facade + soft-delete foundation exist (Phase 2)
- US8 timeline UI can begin once upsert helpers exist; full integrity needs US3/US5/US6 write hooks
- US9/US10 near end; US10 i18n keys can be filled incrementally [P] earlier

## Parallel example (post-foundation)

```bash
# Parallel batch A
T019, T020, T021  # US1 tests
T022, T024        # summary facade + UI

# Parallel batch B (after US3 notes facade exists)
T056 + T065       # prescriptions + diagnostics facades
T058 + T067       # Rx + labs UI
```

## Implementation strategy

1. **MVP**: Phase 1â€“2 + **US1** (summary + RBAC + audit on chart open).
2. **Patient chart depth**: US2 history domains.
3. **Clinical core**: US3 documentation + diagnoses.
4. **Meds + labs**: US5 + US6 in parallel.
5. **Docs/consent + timeline**: US7 â†’ US8.
6. **Admin + a11y/i18n**: US9 â†’ US10.
7. **Polish/DoD**: migration completeness, tests, Stitch export, production checklist.

## Suggested MVP scope

**US1 only** after Phase 2 â€” proves EMR module, RBAC, summary UI, and audit baseline before broader chart domains.

## Phase 14: Convergence

**Purpose**: Close remaining gaps found by `/speckit-converge` against spec/plan vs current codebase (UI wiring + dual-stack FR-033 cutover). Open T108 (Stitch export) remains separately tracked.

- [x] T120 CRITICAL: Rewire patient medical-profile edits from legacy `MedicalProfileForm`/`MedicalProfile` string arrays onto EMR history upserts (`emrUpsertAllergy`, `emrUpsertCondition`, lifestyle/emergency) so summary/critical-alerts and patient edits share one SoT per FR-006, FR-033, US2/AC1 (contradicts)
- [x] T121 Build EMR history edit forms/dialogs under `src/components/emr/history/` wired to `src/actions/emr/history.ts` for patient self-report and clinician-attested writes per FR-005, FR-028, US2/AC1 (missing)
- [x] T122 Route doctor `amendSoap` / clinical summary save-finalize-dismiss through `src/lib/emr/notes.ts` (timeline + audit) and mount promoted EMR SOAP UI in consultation workspace per FR-033, FR-040, FR-043, US3 (contradicts)
- [x] T123 Mount `DiagnosisList` and add diagnosis create/edit with optional ICD-10 combobox on doctor consultation/chart calling `emrUpsertDiagnosis` per FR-009, FR-046, US3/AC1 (missing)
- [x] T124 Implement DoctorNote create/save facade + Server Action + mount `DoctorNoteList` UI for clinician free-text notes per FR-007, US3 (missing)
- [x] T125 Add care/treatment plan create and status-update UI wired to `emrUpsertPlan`/`emrPublishPlan` (beyond read-only `CarePlanList`) per FR-010, US4 (missing)
- [x] T126 Add doctor-facing Renew CTA on Rx list/detail calling `emrRenewPrescription` per FR-011, SC-006, ui-review G3 (missing)
- [x] T127 Migrate doctor prescription list/get and lab inbox reads from direct Prisma onto `src/lib/emr/prescriptions` and `src/lib/emr/diagnostics` per FR-033 (contradicts)
- [x] T128 Migrate patient detail routes `labs/[id]`, `records/[id]`, `prescriptions/[id]` from legacy Module 3 actions onto EMR facades per FR-033 (contradicts)
- [x] T129 Migrate `doctor/patients/[id]/records` subpage from legacy `getChart` onto EMR history/documents/timeline facades per FR-033 (contradicts)
- [x] T130 Add Admin nav entry for `/admin/emr`, patient search UI via `emrAdminSearchPatients`, and localized copy per FR-021, FR-029, US9 (partial)
- [x] T131 Define imaging vs lab classification (model field or documented unified `LabResult` scope) and mount `ImagingList` on an authorized route per FR-013, US6 (partial)
- [x] T132 Mount `VersionHistoryList` on SOAP, prescription, and care-plan detail surfaces for authorized clinicians per FR-039 (partial)
- [x] T133 Implement real Playwright smoke in `tests/e2e/emr/` for patient summary, doctor SOAP sign, and lab release visibility per plan Testing strategy (partial)


## Phase 15: Convergence

**Purpose**: Close residual gaps after Phase 14 implement — remaining FR-033 dual-stack paths, documents/referral UI, ICD combobox, history immunization/family writes, and admin legal-hold. Open T108 (Stitch export) remains separately tracked.

- [x] T134 Route doctor `dismissSoap` through `src/lib/emr/notes.ts` (timeline + audit) instead of direct `prisma.soapNote` updates in `src/actions/doctor/soap.ts` per FR-033, FR-008, FR-040 (contradicts)
- [x] T135 Route doctor `markLabReviewed` / lab release through `src/lib/emr/diagnostics.ts` (`releaseLabToPatient` + EMR audit/timeline) instead of direct Prisma in `src/actions/doctor/records.ts` per FR-033, FR-013, FR-043 (contradicts)
- [x] T136 Finish patient medical-profile SoT cutover: stop `MedicalProfileForm`/`updateMedicalProfile` writing legacy allergy/condition string arrays; keep non-history fields only or migrate fully onto EMR history facades per FR-033, FR-006, US2 (contradicts)
- [x] T137 Migrate patient `records` list page from `listRecords`/`prisma.medicalRecord` onto EMR documents/timeline/records facades under `src/app/[locale]/patient/records/` per FR-033, FR-001 (contradicts)
- [x] T138 Mount document upload, soft-delete/restore, and controlled download UI wired to `emrRegisterDocument`, `emrSoftDeleteDocument`, `emrRestoreDocument`, `emrGetDocumentDownloadUrl` per FR-015, FR-016, FR-041, SC-016 (missing)
- [x] T139 Mount referral letter and medical certificate create/view flows (document kinds `REFERRAL`/`CERTIFICATE`) on authorized clinician surfaces per FR-015, US7 (missing)
- [x] T140 Add Administrator legal-hold set/clear UI on `/admin/emr` calling `emrAdminSetLegalHold` (beyond hold count display) per FR-021, FR-044 (partial)
- [x] T141 Replace diagnosis ICD-10 free-text `Input` with catalog search combobox plus free-text fallback in `src/components/emr/diagnoses/diagnosis-form.tsx` per FR-046, ui-review G4, SC-019 (partial)
- [x] T142 Extend `HistoryEditor` (or sibling forms) with immunization and family-history create/edit/soft-delete wired to `emrUpsertImmunization`/`emrUpsertFamilyHistory` per FR-028, US2 (partial)
- [x] T143 Retire or hard-guard orphan Prisma modules `src/actions/patient/labs.ts` and `src/actions/patient/prescriptions.ts` so portals cannot reintroduce dual-stack chart reads per FR-033 (unrequested)

## Phase 16: Convergence

**Purpose**: Close residual gaps after Phase 15 — doctor chart dual-stack display SoT, consent fail-closed gating, soft-delete restore list visibility, care-plan goals/interventions UI, and in-chart search controls. Open T108 (Stitch export) remains separately tracked.

- [x] T144 CRITICAL: Stop rendering doctor chart/workspace clinical panels from legacy `getPatientChart`/`getWorkspaceBundle` Prisma `MedicalProfile` string arrays and parallel labs/Rx/SOAP lists; bind AllergyBanner, overview, labs, and prescriptions to EMR history/summary/diagnostics/prescriptions facades per FR-033, FR-006, FR-027 (contradicts)
- [x] T145 Implement consent fail-closed gating (`assertConsentRequired` or equivalent in `src/domain/emr/consent.ts` + facade) and enforce on telemedicine/care entry points that declare a consent type after withdrawal until re-consent per FR-045, Edge Cases (missing)
- [x] T146 Extend `listDocuments` (and admin/patient document UIs) with an authorized `includeDeleted`/hidden view so soft-deleted items remain recoverable and restore/legal-hold controls can operate per FR-041, SC-016 (partial)
- [x] T147 Add goals and interventions fields to `CarePlanForm` wired through `emrUpsertPlan` so care/treatment plans support clinically material content beyond title/kind per FR-010 (partial)
- [x] T148 Wire in-chart search/filter UI controls (text, status, type, date-range where designed) on timeline and key EMR lists to existing `src/lib/emr/search.ts` helpers with RBAC/release enforcement per FR-048 (partial)
