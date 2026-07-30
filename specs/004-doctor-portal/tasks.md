# Tasks: Doctor Portal & Clinical Workspace

**Input**: Design documents from `/specs/004-doctor-portal/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [ui-review.md](./ui-review.md), [quickstart.md](./quickstart.md)

**Tests**: Included (user requested unit, integration, accessibility, performance).

**UI gate**: Export Stitch doctor designs to `specs/004-doctor-portal/design/` before pixel UI tasks (see T018). Do not redesign. Domain/API/Prisma may proceed without assets.

**Organization**: Setup → Foundational (layout/sidebar/nav/schema/ports) → US1–US10 by priority → Polish (DoD)

**Definition of Done** (validate in Polish): Doctors manage consultations; clinical documentation complete; AI integrated; prescription workflow complete; secure patient-record access; production-ready checks from [quickstart.md](./quickstart.md).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable (different files, no incomplete deps)
- **[Story]**: [US1]…[US10] for story phases only

## Path Conventions

Single Next.js app: `src/`, `prisma/`, `tests/` at repository root (extends Modules 0–3).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, folders, i18n namespaces, test harness

- [x] T001 Confirm `@tanstack/react-query` present in `package.json` (reuse from patient portal; add if missing)
- [x] T002 [P] Extend Zod env schema in `src/lib/env.ts` for doctor AI rate limits, telemedicine, safety-check vendor keys as needed
- [x] T003 [P] Document doctor-portal env vars in `.env.example`
- [x] T004 Create folder skeleton: `src/actions/doctor/`, `src/components/doctor/{shell,dashboard,schedule,queue,patients,workspace,soap,summary,prescriptions,records,labs,video,ai,notifications,profile,settings,shared}/`, `src/domain/doctor/`, `src/lib/doctor/`, extend `src/ports/` + `src/adapters/`
- [x] T005 [P] Add `doctor.*` message namespaces to `src/i18n/messages/en.json` and `src/i18n/messages/ar.json`
- [x] T006 [P] Create test folders `tests/unit/doctor/`, `tests/integration/doctor/`, `tests/e2e/doctor/`, `tests/a11y/doctor/`, `tests/perf/doctor/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Prisma extensions, doctor context/RBAC, shell (layout/sidebar/nav/header), shared primitives, ports — MUST complete before story features

**⚠️ CRITICAL**: No user story work until this phase completes (except T018 design import can run in parallel with backend)

- [x] T007 Extend `prisma/schema.prisma` enums per [data-model.md](./data-model.md) (`CHECKED_IN`, `RESCHEDULED`, `ClinicalNoteStatus`, `DRAFT` on prescriptions, notification categories, `DoctorAiMode`)
- [x] T008 Extend `Appointment` with `checkedInAt`/`completedAt`/`noShowAt`/`noShowReason`; extend `Prescription` for draft/sign fields; migrate `Notification.patientUserId` → `recipientUserId` (or dual-write strategy) in `prisma/schema.prisma`
- [x] T009 Add Prisma models `SoapNote`, `ClinicalSummary`, `PrescriptionLine`, `LabReviewAcknowledgement`, `DoctorAiConversation`, `DoctorAiMessage`, optional `DoctorPatientPanel`, optional `DoctorProfileExtras` in `prisma/schema.prisma`
- [x] T010 Create and apply Prisma migration under `prisma/migrations/` for doctor-portal schema
- [x] T011 Extend seed in `prisma/seed.ts`: doctor user with `doctorProfileId` linked to CMS `Doctor`, sample CHECKED_IN/CONFIRMED appointments, medical profile allergies, draft/active Rx samples, lab preliminary+final, notifications for doctor recipient
- [x] T012 [P] Extend doctor permissions in `src/auth/rbac.ts` (`doctor:portal:access`, `doctor:chart:read`, `doctor:note:write`, `doctor:rx:sign`, `doctor:video:host`, `doctor:ai:use`)
- [x] T013 [P] Implement `requireDoctorContext()` in `src/lib/doctor/context.ts` (session + `doctorProfileId` → `doctorId`; `DOCTOR_PROFILE_UNLINKED`)
- [x] T014 [P] Implement `withDoctor` helpers in `src/actions/doctor/_helpers.ts` (mirror patient `withPatient`; map AuthDomainError codes)
- [x] T015 [P] Implement care-relationship + consultation domain stubs in `src/domain/doctor/{care-relationship,consultation,soap,prescriptions,video,dashboard}.ts`
- [x] T016 [P] Add/extend ports: `src/ports/safety-check.ts`; ensure `ai-assistant.ts` + `telemedicine.ts` support doctor modes/host; stub adapters in `src/adapters/`
- [x] T017 [P] Implement shared doctor UI primitives `EmptyState`, `ErrorState`, `ListSkeleton`, `WidgetSkeleton`, `Pagination`, `SearchFilterBar`, `StatusBadge`, `ConfirmSignDialog`, `AllergyBanner` in `src/components/doctor/shared/`
- [x] T018 [P] Import approved Stitch doctor screens into `specs/004-doctor-portal/design/` (manifest + desktop/mobile); update [ui-review.md](./ui-review.md) — **pixel UI tasks blocked until done**
- [x] T019 Implement `DoctorPortalShell`, `DoctorSidebar`, `DoctorNav`, `DoctorHeader` (inside top nav: search, notifications, profile) in `src/components/doctor/shell/` per Stitch/contracts/ui.md
- [x] T020 Upgrade `src/app/[locale]/doctor/layout.tsx` to wrap with `DoctorPortalShell` + `RoleLayoutGate("DOCTOR")` + React Query provider
- [x] T021 [P] Confirm marketing chrome hidden on `/doctor/*` via `src/lib/auth-routes.ts` / `ChromeGate` (already lists `doctor`; fix if gaps)
- [x] T022 [P] Add PHI audit helpers for doctor events in `src/lib/doctor/phi-audit.ts` (chart view, note finalize, rx sign, video join, lab view, doc download, access deny)

**Checkpoint**: Foundation ready — stories can proceed (UI after T018)

---

## Phase 3: User Story 1 — Doctor Dashboard (Priority: P1) 🎯 MVP

**Goal**: Authenticated doctors see Stitch dashboard: today’s appointments, upcoming, pending notes, recent patients, notifications, AI shortcut, daily statistics, quick actions; isolated widget states.

**Independent Test**: Sign in as doctor → `/en/doctor` shows widgets/empty states; non-doctor denied; one widget failure does not blank others.

### Tests for User Story 1

- [x] T023 [P] [US1] Unit test dashboard widget caps in `tests/unit/doctor/dashboard-caps.test.ts`
- [x] T024 [P] [US1] Integration test `getDashboard` isolation in `tests/integration/doctor/dashboard.test.ts`
- [x] T025 [P] [US1] E2E smoke: doctor dashboard / role denial in `tests/e2e/doctor/dashboard.spec.ts`

### Implementation for User Story 1

- [x] T026 [US1] Implement `getDashboard()` with `Promise.allSettled` in `src/actions/doctor/dashboard.ts` and `src/lib/doctor/dashboard.ts`
- [x] T027 [P] [US1] Build dashboard grid layout in `src/components/doctor/dashboard/dashboard-grid.tsx` per Stitch
- [x] T028 [P] [US1] Implement Today’s Schedule widget (≤8) in `src/components/doctor/dashboard/today-schedule-widget.tsx`
- [x] T029 [P] [US1] Implement Upcoming Consultations widget (≤5) in `src/components/doctor/dashboard/upcoming-widget.tsx`
- [x] T030 [P] [US1] Implement Daily Statistics widget in `src/components/doctor/dashboard/stats-widget.tsx`
- [x] T031 [P] [US1] Implement Pending Clinical Notes + Recent Patients widgets in `src/components/doctor/dashboard/pending-notes-widget.tsx` and `recent-patients-widget.tsx`
- [x] T032 [P] [US1] Implement Notifications summary + AI shortcut widgets in `src/components/doctor/dashboard/notifications-widget.tsx` and `ai-shortcut-widget.tsx`
- [x] T033 [P] [US1] Implement Quick Actions (Start Consultation, View Patient, Create Prescription, Review Lab Results, Complete SOAP Notes, Open AI Assistant) in `src/components/doctor/dashboard/quick-actions.tsx`
- [x] T034 [US1] Wire `src/app/[locale]/doctor/page.tsx` to dashboard grid + empty/error states
- [x] T035 [P] [US1] Add performance budget helper/assert for dashboard widget query `take` limits in `tests/perf/doctor/dashboard-caps.perf.test.ts`

**Checkpoint**: MVP dashboard usable for linked doctors

---

## Phase 4: User Story 2 — Schedule, Upcoming Appointments & Patient Queue (Priority: P1)

**Goal**: Doctors manage today’s schedule, upcoming list, and queue; start consultation with ≤1 In progress; mark no-show.

**Independent Test**: Open schedule/queue; start visit; second start blocked; no-show clears queue; other doctor’s appointment → NOT_FOUND.

### Tests for User Story 2

- [x] T036 [P] [US2] Unit test consultation lifecycle + single in-progress in `tests/unit/doctor/consultation.test.ts`
- [x] T037 [P] [US2] Integration test start/complete/no-show actions in `tests/integration/doctor/appointments.test.ts`
- [x] T038 [P] [US2] E2E schedule → start consultation in `tests/e2e/doctor/schedule-queue.spec.ts`

### Implementation for User Story 2

- [x] T039 [US2] Flesh domain `src/domain/doctor/consultation.ts` (transitions, single IN_PROGRESS guard)
- [x] T040 [US2] Implement schedule/appointments/queue actions in `src/actions/doctor/{schedule,appointments,queue}.ts`
- [x] T041 [P] [US2] Build Today’s Schedule page UI in `src/components/doctor/schedule/` + `src/app/[locale]/doctor/schedule/page.tsx`
- [x] T042 [P] [US2] Build Upcoming Appointments list UI in `src/components/doctor/schedule/upcoming-list.tsx` + `src/app/[locale]/doctor/appointments/` routes
- [x] T043 [P] [US2] Build Patient Queue UI in `src/components/doctor/queue/` + `src/app/[locale]/doctor/queue/page.tsx`
- [x] T044 [US2] Implement `startConsultation`, `completeConsultation`, `markNoShow` with audit in `src/actions/doctor/consultations.ts`
- [x] T045 [US2] Appointment detail route `src/app/[locale]/doctor/appointments/[id]/page.tsx` with start/view-patient actions

**Checkpoint**: Operational day workflow without documentation yet

---

## Phase 5: User Story 3 — Patient Details & Medical Context (Priority: P1)

**Goal**: Care-relationship patient chart summary with allergies/critical flags; patient search from header; secure denial.

**Independent Test**: Open authorized patient → chart; unauthorized id → NOT_FOUND; allergy banner visible when seeded.

### Tests for User Story 3

- [x] T046 [P] [US3] Unit test care-relationship rules in `tests/unit/doctor/care-relationship.test.ts`
- [x] T047 [P] [US3] Integration test patient details authz in `tests/integration/doctor/patients.test.ts`

### Implementation for User Story 3

- [x] T048 [US3] Implement `assertCareRelationship` fully in `src/domain/doctor/care-relationship.ts`
- [x] T049 [US3] Implement `getPatientDetails` + search helpers in `src/actions/doctor/patients.ts` and `src/lib/doctor/patients.ts` (audit chart views)
- [x] T050 [P] [US3] Patient search UI in header (`DoctorHeader` search) + results in `src/components/doctor/patients/patient-search.tsx`
- [x] T051 [P] [US3] Patient Details / medical history summary UI in `src/components/doctor/patients/patient-details.tsx` + `src/app/[locale]/doctor/patients/[patientId]/page.tsx`
- [x] T052 [US3] Wire `AllergyBanner` / critical flags on patient + workspace entry points

**Checkpoint**: Safe chart access before consultation docs

---

## Phase 6: User Story 4 — Consultation Workspace (Priority: P1)

**Goal**: In-progress visit workspace aggregating patient context and entry points to SOAP, summary, Rx, records, labs, video, AI.

**Independent Test**: Start visit → workspace loads; resume after refresh; Cancelled/No-show blocks mutations; offline disables Complete.

### Tests for User Story 4

- [x] T053 [P] [US4] Integration test workspace loader authz in `tests/integration/doctor/workspace.test.ts`
- [x] T054 [P] [US4] E2E open workspace from queue in `tests/e2e/doctor/workspace.spec.ts`

### Implementation for User Story 4

- [x] T055 [US4] Implement `getConsultationWorkspace` in `src/actions/doctor/consultations.ts` / `src/lib/doctor/workspace.ts`
- [x] T056 [US4] Build `WorkspaceShell` + tabs/panels per Stitch in `src/components/doctor/workspace/`
- [x] T057 [US4] Route `src/app/[locale]/doctor/consultations/[appointmentId]/page.tsx` (+ layout if needed)
- [x] T058 [P] [US4] Client offline banner + disable Start/Complete/Sign controls in `src/components/doctor/workspace/offline-guard.tsx`
- [x] T059 [US4] Wire Complete Visit from workspace to `completeConsultation` + pending-notes behavior

**Checkpoint**: Clinical hub ready for documentation modules

---

## Phase 7: User Story 5 — SOAP Notes & Clinical Summary (Priority: P1)

**Goal**: Draft/save/finalize/amend SOAP + clinical summary with Review & Sign attestation and versioning.

**Independent Test**: Save draft; finalize requires Assessment+Plan; amend creates new version; unauthorized denied.

### Tests for User Story 5

- [x] T060 [P] [US5] Unit test SOAP finalize/amend/late rules in `tests/unit/doctor/soap.test.ts`
- [x] T061 [P] [US5] Integration test soap/summary sign + conflict in `tests/integration/doctor/soap.test.ts`
- [x] T062 [P] [US5] E2E draft → finalize SOAP in `tests/e2e/doctor/soap.spec.ts`

### Implementation for User Story 5

- [x] T063 [US5] Implement domain rules in `src/domain/doctor/soap.ts` (and summary helpers)
- [x] T064 [US5] Implement SOAP actions (`saveSoapDraft`, `finalizeSoap`, `amendSoap`, `dismissSoap`) in `src/actions/doctor/soap.ts`
- [x] T065 [P] [US5] Implement Clinical Summary actions in `src/actions/doctor/clinical-summary.ts`
- [x] T066 [P] [US5] SOAP editor UI + ConfirmSignDialog in `src/components/doctor/soap/` + route `…/soap/page.tsx`
- [x] T067 [P] [US5] Clinical Summary editor UI in `src/components/doctor/summary/` + route `…/summary/page.tsx`
- [x] T068 [US5] Pending-notes queries powering dashboard widget + dismiss-with-reason flow
- [x] T069 [US5] Audit finalize/amend/dismiss via `src/lib/doctor/phi-audit.ts`

**Checkpoint**: Clinical documentation complete path available

---

## Phase 8: User Story 6 — Create, Review & Sign Prescriptions (Priority: P1)

**Goal**: Draft prescription lines, Review & Sign with allergy hard-block and interaction ack; release ACTIVE to patient portal; digital signature attestation.

**Independent Test**: Draft hidden from patient; allergy block; successful sign → ACTIVE + audit; AI cannot sign.

### Tests for User Story 6

- [x] T070 [P] [US6] Unit test Rx safety gates in `tests/unit/doctor/prescriptions.test.ts`
- [x] T071 [P] [US6] Integration test draft→sign + patient visibility in `tests/integration/doctor/prescriptions.test.ts`
- [x] T072 [P] [US6] E2E create + review + sign in `tests/e2e/doctor/prescriptions.spec.ts`

### Implementation for User Story 6

- [x] T073 [US6] Implement `SafetyCheckPort` adapter + domain gates in `src/domain/doctor/prescriptions.ts`
- [x] T074 [US6] Implement prescription actions in `src/actions/doctor/prescriptions.ts` (`createPrescriptionDraft`, `updatePrescriptionDraft`, `signPrescription`, list/get)
- [x] T075 [P] [US6] Create Prescription form UI in `src/components/doctor/prescriptions/prescription-form.tsx` + `src/app/[locale]/doctor/prescriptions/new/page.tsx`
- [x] T076 [P] [US6] Review & Sign UI with digital signature attestation in `src/components/doctor/prescriptions/prescription-review-sign.tsx` + `[id]/page.tsx`
- [x] T077 [US6] Ensure patient portal loaders still exclude `DRAFT` in `src/actions/patient/prescriptions.ts` (compat check/fix)
- [x] T078 [US6] Block visit-scoped Rx when appointment Cancelled/No-show

**Checkpoint**: Prescription workflow complete

---

## Phase 9: User Story 7 — AI Clinical Assistants (Priority: P2)

**Goal**: AI Medical Assistant, AI Clinical Documentation, AI Prescription Assistant with Accept→draft only, rate limit 30/h, disclaimers, no auto-sign.

**Independent Test**: Generate + accept into draft; finalize still manual; rate limit; cross-patient context denied.

### Tests for User Story 7

- [x] T079 [P] [US7] Unit test AI rate-limit + accept-only-to-draft rules in `tests/unit/doctor/ai.test.ts`
- [x] T080 [P] [US7] Integration test AI chat authz + retention fields in `tests/integration/doctor/ai.test.ts`

### Implementation for User Story 7

- [x] T081 [US7] Doctor AI conversation actions in `src/actions/doctor/ai.ts` + streaming route `src/app/api/doctor/ai/chat/route.ts`
- [x] T082 [P] [US7] AI Medical Assistant UI in `src/components/doctor/ai/medical-assistant.tsx` + `/doctor/ai/page.tsx`
- [x] T083 [P] [US7] AI Documentation UI + accept-into-SOAP/summary in `src/components/doctor/ai/documentation-panel.tsx` + `/doctor/ai/documentation/page.tsx`
- [x] T084 [P] [US7] AI Prescription Assistant UI + accept lines in `src/components/doctor/ai/prescription-panel.tsx` + `/doctor/ai/prescription/page.tsx`
- [x] T085 [US7] Persist `DoctorAiConversation`/`DoctorAiMessage`; enforce ≤30/hour; audit generate/accept/discard
- [x] T086 [US7] Always-visible clinical-judgment disclaimer component in `src/components/doctor/ai/disclaimer.tsx`

**Checkpoint**: AI Assistant integrated without replacing clinician authority

---

## Phase 10: User Story 8 — Medical Records, Labs & Imaging (Priority: P2)

**Goal**: Timeline/list of records; lab/imaging review (Preliminary+Final); attachments via authenticated proxy; optional mark reviewed.

**Independent Test**: Doctor sees preliminary lab; patient does not unless Released; foreign patient NOT_FOUND; view audited.

### Tests for User Story 8

- [x] T087 [P] [US8] Unit test lab visibility asymmetry doctor vs patient in `tests/unit/doctor/labs-visibility.test.ts`
- [x] T088 [P] [US8] Integration test records/labs authz + mark reviewed in `tests/integration/doctor/records-labs.test.ts`

### Implementation for User Story 8

- [x] T089 [US8] Implement records/labs actions in `src/actions/doctor/{records,labs}.ts`
- [x] T090 [P] [US8] Medical records timeline/list UI in `src/components/doctor/records/` + `patients/[patientId]/records/page.tsx`
- [x] T091 [P] [US8] Lab Results & Imaging UI + critical banner in `src/components/doctor/labs/` + `patients/[patientId]/labs/page.tsx`
- [x] T092 [US8] Authenticated document proxy `src/app/api/doctor/documents/[id]/route.ts` + reuse/adapt `DocumentViewer`
- [x] T093 [US8] `markLabReviewed` + `LabReviewAcknowledgement` persistence
- [x] T094 [US8] Audit lab/record view/download events

**Checkpoint**: Secure access to patient records/labs

---

## Phase 11: User Story 9 — Video Consultation (Priority: P2)

**Goal**: Doctor host join within window; admit waiting patient when designed; audit; continue docs if media fails.

**Independent Test**: Inside window join OK; outside → JOIN_WINDOW_CLOSED; join audited; no recording download.

### Tests for User Story 9

- [x] T095 [P] [US9] Unit test join window (shared/doctor) in `tests/unit/doctor/video.test.ts`
- [x] T096 [P] [US9] Integration test doctor video session mint in `tests/integration/doctor/video.test.ts`
- [x] T097 [P] [US9] E2E video route smoke (stub provider) in `tests/e2e/doctor/video.spec.ts`

### Implementation for User Story 9

- [x] T098 [US9] Implement `getDoctorVideoSession` / `admitVideoPatient` in `src/actions/doctor/consultations.ts` (or `video.ts`) using `TelemedicinePort`
- [x] T099 [US9] Video host UI in `src/components/doctor/video/` + `consultations/[appointmentId]/video/page.tsx`
- [x] T100 [US9] Audit join/leave/admit/fail; block outside window; no download control in v1

**Checkpoint**: Secure telemedicine host path

---

## Phase 12: User Story 10 — Notifications, Profile & Settings (Priority: P3)

**Goal**: Notification center + preferences; doctor profile; account/security entry points; language EN/AR + RTL.

**Independent Test**: List/mark/dismiss notifications; deep link re-authz; language switch; profile save.

### Tests for User Story 10

- [x] T101 [P] [US10] Integration test notifications recipient scoping in `tests/integration/doctor/notifications.test.ts`
- [x] T102 [P] [US10] E2E settings language toggle smoke in `tests/e2e/doctor/settings.spec.ts`
- [x] T103 [P] [US10] Accessibility checks for shell + settings primary controls in `tests/a11y/doctor/shell-settings.a11y.ts`

### Implementation for User Story 10

- [x] T104 [US10] Notification actions + trigger helpers (check-in, visit soon, pending notes >24h, new labs) in `src/actions/doctor/notifications.ts` and `src/lib/doctor/notification-triggers.ts`
- [x] T105 [P] [US10] Notification Center UI in `src/components/doctor/notifications/` + `/doctor/notifications/page.tsx`; wire header bell badge
- [x] T106 [P] [US10] Doctor Profile form in `src/components/doctor/profile/` + `/doctor/profile/page.tsx`
- [x] T107 [P] [US10] Settings (notification prefs, language/timezone) in `src/components/doctor/settings/` + `/doctor/settings/page.tsx`
- [x] T108 [US10] Link Account Security to Module 1 `/account/change-password` and `/account/sessions` from settings
- [x] T109 [US10] Ensure header search/notifications/profile match Stitch after design pack (revisit T019)

**Checkpoint**: Portal hygiene complete

---

## Phase 13: Polish & Cross-Cutting (Production Ready)

**Purpose**: DoD validation, a11y/perf sweeps, security, quickstart

- [x] T110 [P] Run and fix [quickstart.md](./quickstart.md) validation scenarios; record results in `specs/004-doctor-portal/quickstart-results.md` (or checklist notes)
- [x] T111 [P] Accessibility sweep: keyboard paths for Start/Sign/Complete + axe on dashboard/workspace in `tests/a11y/doctor/`
- [x] T112 [P] Performance tests: dashboard ≤30s post-login budget smoke + Patient Details ≤3s helper in `tests/perf/doctor/`
- [x] T113 Security review pass: no PHI in URLs; anti-enumeration; `no-store` on clinical routes; cookie mutation only in actions/handlers
- [x] T114 [P] Complete [ui-review.md](./ui-review.md) screen table (✅/❌) against Stitch `design/` assets
- [x] T115 i18n completeness: all `doctor.*` keys present EN/AR; RTL spot-check schedule/workspace/SOAP
- [x] T116 Seed + docs: update README/quickstart credentials for doctor; ensure `doctor@…` linked profile
- [x] T117 Code cleanup: remove dead stubs; align error codes with [contracts/doctor-api.md](./contracts/doctor-api.md)
- [x] T118 Definition of Done sign-off checklist in `specs/004-doctor-portal/checklists/dod.md` covering: consultations managed, documentation complete, AI integrated, Rx workflow complete, secure records access, production ready

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS** all user stories
- **US1–US10**: Depend on Foundational; prefer P1 order for MVP; P2/P3 can parallelize after US1–US2
- **Polish**: After desired stories complete (all for production DoD)

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|--------|
| US1 Dashboard | Foundation | MVP; soft links to later routes OK as stubs |
| US2 Schedule/Queue | Foundation | Enables Start Consultation |
| US3 Patient Details | Foundation | Header search; used by US4+ |
| US4 Workspace | US2 (start) | Can stub if appointments seeded IN_PROGRESS |
| US5 SOAP/Summary | US4 | Pending notes feed US1 widget |
| US6 Prescriptions | US3/US4 context | Safety port from Foundation |
| US7 AI | US5/US6 drafts optional | Can accept into drafts once those exist |
| US8 Records/Labs | US3 | Independent of SOAP |
| US9 Video | US4 | Visit type VIDEO |
| US10 Notif/Settings | Foundation | Triggers improve after US2/US5/US8 |

### Within Each Story

- Tests listed first SHOULD fail before implementation
- Domain/actions before UI
- Sign/finalize before AI accept wiring where overlapping

### Parallel Opportunities

- Phase 1: T002–T006 in parallel after T004
- Phase 2: T012–T017, T018, T021–T022 parallel; T019 after T017
- After Foundation: US8 ∥ US10 beside US5/US6
- Widget/page tasks marked [P] within a story

---

## Parallel Example: User Story 1

```bash
# Tests in parallel:
Task: T023 unit dashboard-caps
Task: T024 integration getDashboard
Task: T025 e2e dashboard smoke

# Widgets in parallel after T026 loader:
Task: T028 today-schedule-widget
Task: T029 upcoming-widget
Task: T030 stats-widget
Task: T031 pending-notes + recent-patients
Task: T032 notifications + AI shortcut
Task: T033 quick-actions
```

---

## Parallel Example: Foundation

```bash
Dev A: T007–T011 Prisma + seed
Dev B: T012–T016 RBAC/context/domain/ports
Dev C: T017–T020 shared UI + shell + layout (pixel after T018)
```

---

## Implementation Strategy

### MVP First (Foundation + US1)

1. Phase 1 Setup  
2. Phase 2 Foundational (schema + Doctor Layout/Sidebar/Nav/Header)  
3. Phase 3 US1 Dashboard (schedule/upcoming/stats/notifications/quick actions widgets)  
4. **STOP & VALIDATE** — linked doctor sees clinical home; roles denied  

### Incremental Delivery

1. US2 Schedule/Queue → start visits  
2. US3 Patient chart → US4 Workspace  
3. US5 Documentation + US6 Prescriptions → core clinical DoD  
4. US7 AI → US8 Records/Labs/Imaging/Attachments → US9 Video  
5. US10 Notifications/Profile/Settings/Security/Language → Phase 13 production DoD  

### Suggested MVP Scope

**Foundation + US1 (+ US2 if capacity)** — doctor layout, sidebar, navigation, dashboard layout, today’s schedule, upcoming, statistics, notifications teaser, quick actions.

---

## Notes

- [P] = different files, no incomplete deps  
- Cookie/session writes only in Server Actions / Route Handlers (never RSC `auth()`)  
- Stitch is UI SoT — no redesign; interim tokens only until T018  
- Commit after each task or logical group  
- Format validation: all tasks use `- [x] Tnnn ...` with file paths; story tasks include `[USn]`  

---

## Phase 14: Convergence

**Purpose**: Close gaps found by `/speckit-converge` (2026-07-30) between spec/plan/tasks intent and the current codebase. Prior phases remain unchanged.

- [x] T119 CRITICAL: Add authenticated PHI document proxy in `src/app/api/doctor/documents/[id]/route.ts` with care-relationship check + download audit per FR-021, plan:document proxy, T092 (missing)
- [x] T120 CRITICAL: Implement offline banner + disable Start/Complete/Sign/Finalize when offline in `src/components/doctor/workspace/offline-guard.tsx` and wire into workspace/Rx/SOAP sign UIs per FR-031, US4/AC6, T058 (missing)
- [x] T121 HIGH: Add streaming doctor AI chat Route Handler `src/app/api/doctor/ai/chat/route.ts` (CSRF + DOCTOR auth + rate limit) per contracts/doctor-api.md, plan:AI stream, T081 (partial)
- [x] T122 HIGH: Implement `dismissSoap` / dismiss clinical summary with audited reason + UI in `src/actions/doctor/soap.ts` (and summary) per FR-009, FR-033, T064 (missing)
- [x] T123 HIGH: Implement `admitVideoPatient` + waiting-room admit UX/audit in `src/actions/doctor/video.ts` and video UI per FR-022, US9/AC2, T098 (missing)
- [x] T124 HIGH: Migrate `Notification.patientUserId` → `recipientUserId` (Prisma migration + patient/doctor query updates) per plan:T008, data-model.md, FR-023 (contradicts)
- [x] T125 HIGH: Add doctor notification triggers (check-in, visit-soon ~10m, new labs, pending-notes aging >24h) in `src/lib/doctor/notification-triggers.ts` per FR-023, FR-033, US10/AC2, T104 (missing)
- [x] T126 HIGH: Add patient search to inside top nav in `src/components/doctor/shell/doctor-header.tsx` (+ `patient-search.tsx`) per FR-034, US3, T050 (partial)
- [x] T127 HIGH: Add medical records list route `src/app/[locale]/doctor/patients/[id]/records/page.tsx` (+ components under `src/components/doctor/records/`) per FR-020, plan:records route, T090 (partial)
- [x] T128 HIGH: Add doctor test suites claimed by tasks but absent: `tests/integration/doctor/`, `tests/e2e/doctor/`, `tests/a11y/doctor/`, `tests/perf/doctor/` covering dashboard role denial, schedule start, SOAP finalize, Rx allergy block, offline Sign per SC-005/SC-013–SC-016, T023–T112 (missing)
- [x] T129 MEDIUM: Add AI mode subroutes `/doctor/ai/documentation` and `/doctor/ai/prescription` (or redirects into mode-scoped UI) in `src/app/[locale]/doctor/ai/` per FR-018, plan:AI routes, T083/T084 (partial)
- [x] T130 MEDIUM: Add deep-linkable consultation subroutes `…/soap`, `…/summary`, `…/video` under `src/app/[locale]/doctor/consultations/[appointmentId]/` (or document workspace tabs as canonical + add redirects) per plan:workspace subroutes (partial)
- [x] T131 MEDIUM: Seed DRAFT prescription (+ optional draft SOAP) for linked doctor/patient in `prisma/seed.ts` per T011 (partial)
- [x] T132 MEDIUM: Add `/doctor/appointments/upcoming` page or redirect to appointments list in `src/app/[locale]/doctor/appointments/upcoming/page.tsx` per plan:upcoming route (partial)
- [x] T133 MEDIUM: Extract shared `AllergyBanner` in `src/components/doctor/shared/allergy-banner.tsx` and mount on patient chart + workspace entry points per FR-010/FR-011, T052 (partial)
- [x] T134 LOW: Record quickstart validation results in `specs/004-doctor-portal/quickstart-results.md` after T119–T128 per T110 (missing)
