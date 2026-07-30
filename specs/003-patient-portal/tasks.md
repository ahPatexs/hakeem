# Tasks: Patient Portal & Dashboard

**Input**: Design documents from `/specs/003-patient-portal/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [ui-review.md](./ui-review.md), [quickstart.md](./quickstart.md)

**Tests**: Included (user requested unit, integration, accessibility, performance).

**UI gate**: Export Stitch patient designs to `specs/003-patient-portal/design/` before UI implementation tasks (see T016). Do not redesign.

**Organization**: Setup → Foundational (layout/shell/schema/ports) → US1–US10 by priority → Polish

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable (different files, no incomplete deps)
- **[Story]**: [US1]…[US10] for story phases only

## Path Conventions

Single Next.js app: `src/`, `prisma/`, `tests/` at repository root (extends Modules 0–1).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, folders, i18n namespaces, test harness

- [x] T001 Install `@tanstack/react-query` (and dev types if needed) in `package.json`
- [x] T002 [P] Extend Zod env schema in `src/lib/env.ts` for storage, payments, telemedicine, and AI keys
- [x] T003 [P] Document new env vars in `.env.example` (blob/S3, payment, video, AI, malware scan)
- [x] T004 Create folder skeleton: `src/actions/patient/`, `src/components/patient/{shell,dashboard,appointments,doctors,records,labs,prescriptions,payments,notifications,profile,settings,ai,shared}/`, `src/domain/patient/`, `src/lib/patient/`, `src/ports/`, `src/adapters/`
- [x] T005 [P] Add `patient.*` message namespaces to `src/i18n/messages/en.json` and `src/i18n/messages/ar.json`
- [x] T006 [P] Create test folders `tests/unit/patient/`, `tests/integration/patient/`, `tests/e2e/patient/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Prisma models, ports, patient shell (layout/sidebar/nav), shared UI primitives, RBAC extensions — required before story UI/features

**⚠️ CRITICAL**: No user story work until this phase completes (except T016 design import can run in parallel with backend)

- [x] T007 Extend `prisma/schema.prisma` with patient-portal enums from `data-model.md` (`AppointmentStatus`, `AppointmentMode`, `LabReleaseStatus`, `LabResultPhase`, `PrescriptionStatus`, `PaymentStatus`, `NotificationCategory`, `UploadScanStatus`, `ClinicalDocumentKind`)
- [x] T008 Add Prisma models `PatientProfile`, `MedicalProfile`, `PortalSettings`, `PatientUpload`, `Appointment`, `ClinicalDocument`, `MedicalRecord`, `LabResult`, `Prescription`, `PaymentObligation`, `PaymentAttempt`, `Notification`, `AiConversation`, `AiMessage` in `prisma/schema.prisma`
- [x] T009 Create and apply Prisma migration for patient-portal models under `prisma/migrations/`
- [x] T010 Extend seed in `prisma/seed.ts` with demo patient profile, sample appointments, released lab, active Rx, record, notification, pending payment (for local QA)
- [x] T011 [P] Extend patient permissions in `src/auth/rbac.ts` (`patient:portal:access`, records/payments/ai read-write as planned)
- [x] T012 [P] Implement ports in `src/ports/{storage,payments,telemedicine,ai-assistant,malware-scan}.ts`
- [x] T013 [P] Add stub/dev adapters in `src/adapters/` for storage, payments, telemedicine, AI, malware scan
- [x] T014 Implement shared patient UI primitives `EmptyState`, `ErrorState`, `ListSkeleton`, `WidgetSkeleton`, `Pagination`, `SearchFilterBar`, `StatusBadge`, `ConfirmDialog` in `src/components/patient/shared/`
- [x] T015 Implement `PortalShell`, `PortalSidebar`, `PortalNav` in `src/components/patient/shell/` per Stitch (layout chrome only)
- [x] T016 [P] Import approved Stitch patient screens into `specs/003-patient-portal/design/` (manifest + desktop/mobile); confirm `ui-review.md` gate can start — **UI tasks blocked until done**
- [x] T017 Upgrade `src/app/[locale]/patient/layout.tsx` to wrap children with `PortalShell` + `requireRole("PATIENT")` + optional React Query provider
- [x] T018 [P] Extend `ChromeGate` / auth-route helpers so marketing Navbar/Footer do not conflict with portal shell on `/patient/*` in `src/components/layout/chrome-gate.tsx` and `src/lib/auth-routes.ts` as needed
- [x] T019 [P] Add domain helpers stubs `src/domain/patient/{appointments,video,labs,prescriptions,payments}.ts` (pure functions; fill in story phases)
- [x] T020 [P] Add PHI audit helper wrappers in `src/auth/audit.ts` (or `src/lib/patient/phi-audit.ts`) for view/download/join/upload events (≥6y retention policy note)

**Checkpoint**: Foundation ready — stories can proceed (UI after T016)

---

## Phase 3: User Story 1 — Dashboard (Priority: P1) 🎯 MVP

**Goal**: Authenticated patients see Stitch dashboard with widgets, quick actions, appointment summary, notifications teaser, recent activity, and isolated loading/empty/error states.

**Independent Test**: Sign in as patient → `/en/patient` shows welcome + widgets/empty states; non-patient denied; one widget failure does not blank others.

### Tests for User Story 1

- [x] T021 [P] [US1] Unit test dashboard widget cap helpers in `tests/unit/patient/dashboard-caps.test.ts`
- [x] T022 [P] [US1] E2E smoke: patient dashboard renders / unauthorized roles redirected in `tests/e2e/patient/dashboard.spec.ts`

### Implementation for User Story 1

- [x] T023 [US1] Implement `getDashboard()` loader with `Promise.allSettled` widget isolation in `src/actions/patient/dashboard.ts` and `src/lib/patient/dashboard.ts`
- [x] T024 [P] [US1] Build dashboard layout grid in `src/components/patient/dashboard/dashboard-grid.tsx` matching Stitch
- [x] T025 [P] [US1] Implement Welcome + Quick Actions (Book, Find Doctor, Start AI Chat, View Record, View Prescriptions, Edit Profile) in `src/components/patient/dashboard/quick-actions.tsx`
- [x] T026 [P] [US1] Implement Appointment Summary widget (≤3 upcoming) in `src/components/patient/dashboard/upcoming-widget.tsx`
- [x] T027 [P] [US1] Implement Recent Doctors / Recent Activity widgets in `src/components/patient/dashboard/recent-doctors-widget.tsx` and `recent-records-widget.tsx`
- [x] T028 [P] [US1] Implement Active Prescriptions + Payment Status widgets in `src/components/patient/dashboard/prescriptions-widget.tsx` and `payment-status-widget.tsx`
- [x] T029 [P] [US1] Implement Notifications summary widget (unread count + ≤5) in `src/components/patient/dashboard/notifications-widget.tsx`
- [x] T030 [P] [US1] Implement AI Assistant shortcut card in `src/components/patient/dashboard/ai-shortcut.tsx`
- [x] T031 [US1] Wire dashboard page `src/app/[locale]/patient/page.tsx` to loader + widgets with empty/error/retry

**Checkpoint**: MVP dashboard operational for authenticated patients

---

## Phase 4: User Story 2 — Profile & Settings (Priority: P1)

**Goal**: Patients manage personal information, emergency contacts, insurance info, language, theme preference (if in Stitch), privacy/security links, and notification prefs entry points.

**Independent Test**: Edit profile fields + settings; persist across reload; EN↔AR; invalid uploads rejected.

### Tests for User Story 2

- [x] T032 [P] [US2] Unit tests for profile/settings Zod schemas in `tests/unit/patient/profile-settings.test.ts`
- [x] T033 [P] [US2] Integration test update profile ownership in `tests/integration/patient/profile.test.ts`

### Implementation for User Story 2

- [x] T034 [US2] Implement profile/settings Server Actions in `src/actions/patient/profile.ts` and `src/actions/patient/settings.ts`
- [x] T035 [P] [US2] Personal information form UI in `src/components/patient/profile/personal-form.tsx`
- [x] T036 [P] [US2] Emergency contacts + insurance information sections in `src/components/patient/profile/emergency-form.tsx` and `insurance-form.tsx`
- [x] T037 [US2] Profile page `src/app/[locale]/patient/profile/page.tsx` composing Stitch sections + upload field hookup
- [x] T038 [P] [US2] Settings UI: language, theme (if designed), privacy copy, security links to Module 1 password/sessions in `src/components/patient/settings/settings-form.tsx`
- [x] T039 [US2] Settings page `src/app/[locale]/patient/settings/page.tsx`
- [x] T040 [US2] Implement upload API `src/app/api/patient/uploads/route.ts` (MIME/size/count + scan port) and wire profile attachments

**Checkpoint**: Profile + settings usable independently

---

## Phase 5: User Story 3 — Medical Profile (Priority: P2)

**Goal**: Patients maintain medical information — diagnoses/conditions, medications, allergies, and related notes (patient-reported).

**Independent Test**: Save allergies/conditions/meds; other patient cannot read; empty prompts shown.

### Tests for User Story 3

- [x] T041 [P] [US3] Unit/integration medical profile update + authz in `tests/unit/patient/medical-profile.test.ts` and `tests/integration/patient/medical-profile.test.ts`

### Implementation for User Story 3

- [x] T042 [US3] Implement `updateMedicalProfile` / loader in `src/actions/patient/medical-profile.ts`
- [x] T043 [US3] Medical profile UI sections (diagnoses/conditions, medications, allergies) in `src/components/patient/profile/medical-profile-form.tsx`
- [x] T044 [US3] Page `src/app/[locale]/patient/medical-profile/page.tsx`

**Checkpoint**: Medical profile complete

---

## Phase 6: User Story 4 — Find Doctors & Book (Priority: P1)

**Goal**: Doctor search, profile, availability, hold→confirm booking.

**Independent Test**: Search/filter doctors → hold slot → confirm → appears upcoming; expired hold releases slot.

### Tests for User Story 4

- [x] T045 [P] [US4] Unit tests hold/confirm/slot rules in `tests/unit/patient/appointments-domain.test.ts`
- [x] T046 [P] [US4] Integration tests booking race/idempotency in `tests/integration/patient/booking.test.ts`

### Implementation for User Story 4

- [x] T047 [US4] Flesh out appointment domain hold/confirm in `src/domain/patient/appointments.ts`
- [x] T048 [US4] Doctor search/list actions in `src/actions/patient/doctors.ts` (q, specialty, page size 20)
- [x] T049 [US4] Booking actions `holdAppointmentSlot` / `confirmAppointment` in `src/actions/patient/appointments.ts`
- [x] T050 [P] [US4] Doctor search UI + filters in `src/components/patient/doctors/doctor-search.tsx`
- [x] T051 [P] [US4] Doctor profile + availability slots UI in `src/components/patient/doctors/doctor-profile.tsx` and `availability-slots.tsx`
- [x] T052 [US4] Pages `src/app/[locale]/patient/doctors/page.tsx`, `doctors/[slug]/page.tsx`, `appointments/book/page.tsx`

**Checkpoint**: Booking path works end-to-end

---

## Phase 7: User Story 5 — Upcoming, History, Cancel, Reschedule (Priority: P1)

**Goal**: Appointment lists, details, cancel/reschedule within 12h policy.

**Independent Test**: List upcoming/history; cancel outside 12h OK; inside window blocked; reschedule creates replacement.

### Tests for User Story 5

- [x] T053 [P] [US5] Unit tests cancel window + reschedule rules in `tests/unit/patient/cancel-reschedule.test.ts`
- [x] T054 [P] [US5] E2E upcoming/history/cancel happy path in `tests/e2e/patient/appointments.spec.ts`

### Implementation for User Story 5

- [x] T055 [US5] List/detail/cancel/reschedule actions in `src/actions/patient/appointments.ts`
- [x] T056 [P] [US5] Upcoming + history list components with filters/pagination in `src/components/patient/appointments/`
- [x] T057 [P] [US5] Appointment details + confirm dialogs in `src/components/patient/appointments/appointment-detail.tsx`
- [x] T058 [US5] Pages `appointments/upcoming/page.tsx`, `appointments/history/page.tsx`, `appointments/[id]/page.tsx`, and index redirect in `appointments/page.tsx`
- [x] T059 [US5] Emit appointment notifications on book/cancel/reschedule via `src/lib/patient/notifications.ts`

**Checkpoint**: Appointment workflow complete (minus video)

---

## Phase 8: User Story 6 — Video Consultation (Priority: P2)

**Goal**: Join video visits inside join window with audited session.

**Independent Test**: Join inside window succeeds; outside → error; in-person has no join.

### Tests for User Story 6

- [x] T060 [P] [US6] Unit tests join window in `tests/unit/patient/video-window.test.ts`

### Implementation for User Story 6

- [x] T061 [US6] Implement `canJoinVideo` + `getVideoJoinSession` in `src/domain/patient/video.ts` and `src/actions/patient/appointments.ts`
- [x] T062 [US6] Wire telemedicine adapter room/token in `src/adapters/` + audit join/leave
- [x] T063 [US6] Consultation UI shell (pre-join, waiting, error) in `src/components/patient/appointments/video-consultation.tsx`
- [x] T064 [US6] Page `src/app/[locale]/patient/consultations/[id]/page.tsx`

**Checkpoint**: Telemedicine join path works in stub/prod adapter

---

## Phase 9: User Story 7 — Medical Records, Labs, Prescriptions, Documents (Priority: P2)

**Goal**: Secure medical history access — records, diagnoses display from records, medications/Rx, allergies cross-links, labs, document viewer/downloads.

**Independent Test**: Released labs visible; pending hidden; cross-patient NOT_FOUND; download audited; viewer opens PDF/PNG.

### Tests for User Story 7

- [x] T065 [P] [US7] Unit tests lab release + active Rx rules in `tests/unit/patient/clinical-visibility.test.ts`
- [x] T066 [P] [US7] Integration authz cross-patient denial in `tests/integration/patient/clinical-authz.test.ts`

### Implementation for User Story 7

- [x] T067 [US7] Domain helpers in `src/domain/patient/labs.ts` and `prescriptions.ts`
- [x] T068 [US7] Actions `src/actions/patient/{records,labs,prescriptions}.ts` with search/filter/pagination
- [x] T069 [US7] Authenticated document stream `src/app/api/patient/documents/[id]/route.ts` (`Cache-Control: private, no-store`) + PHI audit
- [x] T070 [P] [US7] `DocumentViewer` component in `src/components/patient/records/document-viewer.tsx`
- [x] T071 [P] [US7] Records/labs/prescriptions list+detail UI under `src/components/patient/{records,labs,prescriptions}/`
- [x] T072 [US7] Pages under `src/app/[locale]/patient/{records,labs,prescriptions}/` including `[id]` routes

**Checkpoint**: Secure clinical viewing complete

---

## Phase 10: User Story 8 — Payments, Invoices, Receipts (Priority: P3)

**Goal**: Payment history, outstanding invoices/obligations, receipts, idempotent pay.

**Independent Test**: Dashboard outstanding matches; pay once; retry no double Paid; receipt download when present.

### Tests for User Story 8

- [x] T073 [P] [US8] Unit tests payment idempotency in `tests/unit/patient/payments-domain.test.ts`
- [x] T074 [P] [US8] Integration webhook/intent marking Paid in `tests/integration/patient/payments.test.ts`

### Implementation for User Story 8

- [x] T075 [US8] Domain + actions in `src/domain/patient/payments.ts` and `src/actions/patient/payments.ts`
- [x] T076 [US8] Payment webhook route `src/app/api/patient/payments/webhook/route.ts`
- [x] T077 [P] [US8] Payments UI (history, invoice/obligation row, pay CTA, receipt link) in `src/components/patient/payments/`
- [x] T078 [US8] Page `src/app/[locale]/patient/payments/page.tsx` and `payments/[id]/page.tsx`
- [x] T079 [US8] Notify on payment success/failure via `src/lib/patient/notifications.ts`

**Checkpoint**: Payments operable with adapter/stub

---

## Phase 11: User Story 9 — Notification Center (Priority: P2)

**Goal**: Full notification center — list, read status, dismiss, preferences (ties to settings).

**Independent Test**: Unread badge; mark read/all; dismiss; deep link re-authz; prefs suppress categories.

### Tests for User Story 9

- [x] T080 [P] [US9] Integration notification prefs + deep link authz in `tests/integration/patient/notifications.test.ts`

### Implementation for User Story 9

- [x] T081 [US9] Actions `list/markRead/markAll/dismiss` in `src/actions/patient/notifications.ts`
- [x] T082 [P] [US9] Notification center UI in `src/components/patient/notifications/notification-center.tsx`
- [x] T083 [US9] Page `src/app/[locale]/patient/notifications/page.tsx`
- [x] T084 [US9] Wire settings notification preference toggles to delivery in `src/actions/patient/settings.ts` / notifier

**Checkpoint**: Notification center complete

---

## Phase 12: User Story 10 — AI Assistant (Priority: P2)

**Goal**: AI chat, conversation history, suggested questions, disclaimer, rate limits, no clinical writes.

**Independent Test**: Open AI from dashboard; chat streams; history persists; suggested prompts work; cannot mutate Rx/records.

### Tests for User Story 10

- [x] T085 [P] [US10] Unit tests AI context scoping + rate limit hooks in `tests/unit/patient/ai-guardrails.test.ts`
- [x] T086 [P] [US10] E2E AI page loads with disclaimer in `tests/e2e/patient/ai.spec.ts`

### Implementation for User Story 10

- [x] T087 [US10] AI actions + stream route `src/actions/patient/ai.ts` and `src/app/api/patient/ai/chat/route.ts`
- [x] T088 [US10] Persist conversations/messages; retention note/job stub `scripts/purge-ai-messages.ts`
- [x] T089 [P] [US10] Chat UI, history sidebar, suggested questions in `src/components/patient/ai/`
- [x] T090 [US10] Page `src/app/[locale]/patient/ai/page.tsx` with React Query client island as needed

**Checkpoint**: AI assistant integrated

---

## Phase 13: Polish & Cross-Cutting (DoD)

**Purpose**: Accessibility, performance, security hardening, docs, production readiness

- [x] T091 [P] Accessibility tests (axe or Playwright a11y) for dashboard, booking, records in `tests/e2e/patient/a11y.spec.ts`
- [x] T092 [P] Performance checks: dashboard widget timing budget / list pagination limits documented + vitest or k6 note in `tests/unit/patient/performance-budgets.test.ts`
- [x] T093 [P] Ensure document/upload routes set `Cache-Control: private, no-store` and no PHI in URLs across `src/app/api/patient/**`
- [x] T094 [P] Hold expiry cleanup job/script `scripts/expire-appointment-holds.ts`
- [x] T095 Align Footer/portal CTAs and post-login redirect to `/patient` dashboard in auth login success path if needed (`src/auth/rbac.ts` `homePathForRole` already `/patient` — verify)
- [x] T096 [P] Expand seed + quickstart verification checklist pass against [quickstart.md](./quickstart.md)
- [x] T097 Run bilingual RTL smoke on primary screens; fix `patient.*` missing keys in `en.json`/`ar.json`
- [x] T098 Update `specs/003-patient-portal/ui-review.md` sign-off checkboxes after Stitch import + visual QA
- [x] T099 Production readiness: verify adapter env gates (BAA note), error boundaries, and logout clears client PHI caches in patient React Query provider

---

## Dependencies & Story Order

```text
Phase 1 Setup → Phase 2 Foundational (T016 UI gate for visual tasks)
  → US1 Dashboard (MVP)
  → US2 Profile/Settings ║ US4 Doctors/Book (after foundation)
  → US5 Appointments mgmt (needs US4 bookings or seed)
  → US3 Medical Profile ║ US7 Clinical ║ US9 Notifications (can parallelize after foundation)
  → US6 Video (needs appointments)
  → US8 Payments
  → US10 AI
  → Phase 13 Polish
```

**Suggested MVP**: Phase 1–3 (Foundation + Dashboard) + US4 booking slice if demo requires scheduling.

## Parallel Opportunities

- After T014–T015: shared components vs shell
- Within US1: widgets T025–T030 in parallel
- US2 forms T035–T036 parallel
- US7 list UIs T071 parallel by area
- Polish T091–T094 parallel

## Independent Test Criteria (summary)

| Story | Test |
|-------|------|
| US1 | Dashboard loads for PATIENT; widgets isolate failures |
| US2 | Profile/settings persist; uploads validated |
| US3 | Medical profile CRUD own-data only |
| US4 | Search → hold → confirm booking |
| US5 | Upcoming/history + cancel/reschedule policy |
| US6 | Video join window enforced |
| US7 | Records/labs/Rx + viewer + authz |
| US8 | Pay idempotent + history/receipts |
| US9 | Center read/dismiss/prefs |
| US10 | Chat + history + guardrails |

## Definition of Done (mapped)

- [ ] Patients can manage healthcare journey (US2–US5, US7–US9)
- [ ] Dashboard fully operational (US1)
- [ ] Secure medical record access (US7 + T093)
- [ ] Appointment workflow complete (US4–US6)
- [ ] AI Assistant integrated (US10)
- [ ] Production ready (Phase 13)

## Format Validation

- All tasks use `- [ ]`, Task ID `T001+`, optional `[P]`/`[USn]`, and file paths ✅
