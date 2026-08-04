# Tasks: Platform Services & Shared Infrastructure

**Input**: Design documents from `/specs/006-platform-services/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [ui-review.md](./ui-review.md), [quickstart.md](./quickstart.md)

**Tests**: Included ? unit, integration, performance, security, and e2e (user-requested).

**UI gate**: Do not redesign. Consolidate Stitch-aligned primitives into `src/components/platform/` (incl. `video/*` and `ai/*`). LiveKit React Components wrap Stitch Waiting Room / Video Consultation patterns only.

**Organization** (user categories ? phases):

| Category | Phases / stories |
|----------|------------------|
| Foundation (layout, components, hooks, utilities, API clients) | Phase 1?2 |
| Notifications (in-app, email, SMS, push) | US1?US3 |
| Payments (gateway, billing, refunds) | US4 |
| AI (provider, chat, clinical) | US5 |
| Storage (upload, medical docs, image) | US6 |
| **Video Communication (LiveKit)** | US7 + **Phase 19** (full LiveKit suite) |
| Infrastructure (search, audit, timeline, i18n, flags, config, jobs, queue, monitoring, logging) | US8?US11, US13, Polish |
| Consumer migration | US12 |
| Testing | Per-story tests + Phase 19 security/e2e + Polish |
| Convergence | Phase 17?18 (done) |

**Definition of Done** (validate in Polish + Phase 19): Shared services reusable across Public/Auth/Patient/Doctor/Admin; **LiveKit integrated and reusable** via platform only; AI/notifications/payments operational and centralized; no duplicated business logic; no LiveKit SDK in portals; production-ready per [quickstart.md](./quickstart.md).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable (different files, no incomplete deps)
- **[Story]**: [US1]?[US13] for story phases only

## Path Conventions

Single Next.js app: `src/`, `prisma/`, `tests/` at repository root (extends Modules 001?005).

**Status**: T001?T134 completed in prior implement/converge. **T135+ (Phase 19) are the open LiveKit Video Communication delta** from the updated plan.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folders, env, i18n namespace, test harness, design pack placeholder

- [x] T001 Create folder skeleton per [plan.md](./plan.md): `src/domain/platform/`, `src/lib/platform/`, `src/components/platform/{dialogs,notifications,upload,payments}/`, `src/hooks/platform/`, `src/actions/platform/`, `src/app/api/webhooks/`, `src/app/api/cron/`
- [x] T002 [P] Document platform env vars (`CRON_SECRET`, adapter selectors, health URLs, BAA gate, push flag) in `.env.example`
- [x] T003 [P] Add `platform.*` message namespaces to `src/i18n/messages/en.json` and `src/i18n/messages/ar.json`
- [x] T004 [P] Create test folders `tests/unit/platform/`, `tests/integration/platform/`, `tests/perf/platform/`, `tests/e2e/platform/`
- [x] T005 [P] Add `specs/006-platform-services/design/manifest.json` placeholder listing shared UI surfaces from [ui-review.md](./ui-review.md)
- [x] T006 [P] Create adapter barrel `src/adapters/index.ts` resolving payments/ai/storage/telemedicine/malware/email/sms/push from env

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, outcome taxonomy, retry/jobs core, shared UI kit, hooks, utilities ? MUST complete before story features

**?? CRITICAL**: No user story work until this phase completes (T008 design import may run in parallel)

### Schema & domain core

- [x] T007 Extend `prisma/schema.prisma` with `BackgroundJob`, `WebhookReceipt`, `OutboundMessage`, `SearchDoctorProjection`, `PushDeviceRegistration` per [data-model.md](./data-model.md); create migration under `prisma/migrations/`
- [x] T008 [P] When Stitch auth available, export shared dialog/notification/upload/payment screens into `specs/006-platform-services/design/` and update manifest ? **pixel polish blocked until done; domain may proceed**
- [x] T009 [P] Implement outcome taxonomy in `src/domain/platform/outcomes.ts` per [contracts/platform-services.md](./contracts/platform-services.md)
- [x] T010 [P] Implement retry schedule helpers in `src/domain/platform/retry.ts` (exp backoff + jitter, max 5)
- [x] T011 Implement job claim/complete/fail/dead-letter domain in `src/domain/platform/jobs.ts` and facade `src/lib/platform/jobs.ts`
- [x] T012 Implement cron worker `src/app/api/cron/platform-jobs/route.ts` (CRON_SECRET auth, process due jobs)
- [x] T013 [P] Implement operational log redaction helper in `src/lib/platform/redact.ts`
- [x] T014 [P] Implement idempotency key helper in `src/lib/platform/idempotency.ts`

### Shared layout / components / hooks / utilities

- [x] T015 [P] Promote/re-export shared layout feedback primitives: `EmptyState`, `ErrorState`, `ListSkeleton` into `src/components/platform/` from admin/patient shared (no redesign) per [contracts/ui.md](./contracts/ui.md)
- [x] T016 [P] Promote `ConfirmReasonDialog` into `src/components/platform/dialogs/confirm-reason-dialog.tsx` and re-export
- [x] T017 [P] Add platform barrel `src/components/platform/index.ts`
- [x] T018 [P] Create shared hooks stubs `src/hooks/platform/use-notifications.ts`, `use-upload.ts`, `use-payment-intent.ts` (React Query islands)
- [x] T019 [P] Seed defaults in `prisma/seed.ts` for sample BackgroundJob/OutboundMessage if useful for local cron testing

**Checkpoint**: Foundation ready ? story implementation can begin

---

## Phase 3: User Story 1 ? Shared Notification Delivery (Priority: P1) ?? MVP

**Goal**: In-app notifications via shared Notification Service with channel policy, mark-read, deep links, locale.

**Independent Test**: Trigger product event ? in-app row appears; mark read updates badge; Arabic copy when locale=ar.

### Tests for User Story 1

- [x] T020 [P] [US1] Unit test channel matrix + PartialSuccess rules in `tests/unit/platform/notifications.test.ts`
- [x] T021 [P] [US1] Integration test `notify` creates `Notification` row in `tests/integration/platform/notifications.test.ts`

### Implementation for User Story 1

- [x] T022 [P] [US1] Implement notification event policy constants in `src/domain/platform/notifications.ts`
- [x] T023 [US1] Implement facade `src/lib/platform/notifications.ts` (`notify`, `markNotificationRead`, `markAllNotificationsRead`)
- [x] T024 [P] [US1] Implement shared `NotificationList` / badge primitives in `src/components/platform/notifications/`
- [x] T025 [US1] Wire `use-notifications.ts` to list/unread + invalidate after mark-read
- [x] T026 [US1] Migrate Admin notify helper to call platform facade from `src/lib/admin/notify-admins.ts` (thin wrap)

**Checkpoint**: In-app notifications work via shared facade

---

## Phase 4: User Story 2 ? Email & SMS Messaging Primitives (Priority: P1)

**Goal**: Shared EmailPort/SmsPort; Auth and care transactional sends; rate limits; safe failures.

**Independent Test**: Verification/reset email via EmailPort; SMS stub send when configured; provider down ? retryable failure without secrets in logs.

### Tests for User Story 2

- [x] T027 [P] [US2] Unit test outbound idempotency key + rate-limit mapping in `tests/unit/platform/outbound.test.ts`
- [x] T028 [P] [US2] Integration test email job enqueue + OutboundMessage row in `tests/integration/platform/email.test.ts`

### Implementation for User Story 2

- [x] T029 [P] [US2] Add `src/ports/email.ts` and `src/ports/sms.ts`
- [x] T030 [P] [US2] Implement `src/adapters/stub-email.ts` (wrap/reuse `src/auth/email.ts`) and `src/adapters/stub-sms.ts`
- [x] T031 [US2] Implement domain outbound + facades `src/lib/platform/email.ts`, `src/lib/platform/sms.ts`
- [x] T032 [US2] Implement job handlers for `OUTBOUND_EMAIL` / `OUTBOUND_SMS` in `src/lib/platform/jobs.ts` (or `src/domain/platform/job-handlers.ts`)
- [x] T033 [US2] Migrate Auth challenge sends to `lib/platform/email` from `src/auth/email.ts` / challenge creators without changing anti-enumeration UX

**Checkpoint**: Email/SMS centralized

---

## Phase 5: User Story 3 ? Push Notifications Readiness (Priority: P2)

**Goal**: Device registration + push send path; no-op when disabled.

**Independent Test**: Register token; with push disabled, notify still succeeds for other channels.

### Tests for User Story 3

- [x] T034 [P] [US3] Unit test push skip-when-disabled in `tests/unit/platform/push.test.ts`

### Implementation for User Story 3

- [x] T035 [P] [US3] Add `src/ports/push.ts` and `src/adapters/stub-push.ts`
- [x] T036 [US3] Implement `src/lib/platform/push.ts` + `OUTBOUND_PUSH` job handler
- [x] T037 [P] [US3] Add register/revoke device Server Action in `src/actions/platform/push-devices.ts`
- [x] T038 [US3] Extend `notify` channel matrix to enqueue push when enabled and device present

**Checkpoint**: Push ready behind flag

---

## Phase 6: User Story 4 ? Payment Gateway & Billing Obligations (Priority: P1)

**Goal**: Shared payment intent, billing states, refunds; Patient/Admin use same facade.

**Independent Test**: Intent ? webhook Paid; partial then full refund; over-refund rejected.

### Tests for User Story 4

- [x] T039 [P] [US4] Unit test obligation state machine / refund balance in `tests/unit/platform/billing.test.ts`
- [x] T040 [P] [US4] Integration test refund + patient notify in `tests/integration/platform/refund.test.ts`
- [x] T041 [P] [US4] Perf assert payment list/query caps if applicable in `tests/perf/platform/billing.perf.test.ts`

### Implementation for User Story 4

- [x] T042 [US4] Implement shared billing domain transitions in `src/domain/platform/billing.ts` (reuse/extend admin billing rules)
- [x] T043 [US4] Implement facades `src/lib/platform/payments.ts` and `src/lib/platform/billing.ts`
- [x] T044 [P] [US4] Shared payment UI `PaymentStatusBadge` / checkout panel in `src/components/platform/payments/`
- [x] T045 [US4] Wire `use-payment-intent.ts` to create-intent Server Action
- [x] T046 [US4] Migrate Patient payment create/confirm call sites to platform facades under `src/actions/patient/` / payment components
- [x] T047 [US4] Migrate Admin refund path to call `lib/platform/billing` refund (keep admin audit UX)

**Checkpoint**: Payments/billing/refunds single-sourced

---

## Phase 7: User Story 13 ? Webhooks, Retries & Background Work (Priority: P1)

**Goal**: Signed webhooks, idempotent receipts, fast ACK, side effects via jobs (depends on jobs foundation + payments).

**Independent Test**: Valid webhook applies once; replay no-ops; invalid signature rejected; email failure retries then DLQ.

### Tests for User Story 13

- [x] T048 [P] [US13] Unit test webhook idempotency / illegal backward transition in `tests/unit/platform/webhooks.test.ts`
- [x] T049 [P] [US13] Integration test webhook receipt + replay in `tests/integration/platform/webhooks.test.ts`
- [x] T050 [P] [US13] Integration test job retry ? FAILED/dead-letter in `tests/integration/platform/jobs-retry.test.ts`

### Implementation for User Story 13

- [x] T051 [US13] Implement `src/domain/platform/webhooks.ts` verify + apply rules
- [x] T052 [US13] Harden/move payments webhook to `src/app/api/webhooks/payments/route.ts`; deprecate thin patient-only duplicate or re-export
- [x] T053 [US13] Enqueue `WEBHOOK_SIDE_EFFECT` / notify jobs from webhook handler instead of inline heavy work where needed
- [x] T054 [US13] On max job failures for critical types, call `notifyAdmins` / health signal from `src/lib/platform/jobs.ts`

**Checkpoint**: Reliable async integrations

---

## Phase 8: User Story 5 ? Shared AI Assistance Capability (Priority: P1)

**Goal**: Shared AI chat + clinical assistant entry; governance fail-closed; provider behind port.

**Independent Test**: Chat works when enabled; global/per-user disable denies; cannot sign clinical artifacts via AI.

### Tests for User Story 5

- [x] T055 [P] [US5] Unit test `assertAiAllowed` matrix in `tests/unit/platform/ai-governance.test.ts`
- [x] T056 [P] [US5] Integration test patient/doctor AI route deny when disabled in `tests/integration/platform/ai-fail-closed.test.ts`

### Implementation for User Story 5

- [x] T057 [US5] Canonicalize AI governance in `src/domain/platform/ai-governance.ts` (re-export from admin domain if needed)
- [x] T058 [US5] Implement facade `src/lib/platform/ai.ts` (`assertAiAllowed`, `chat`)
- [x] T059 [US5] Ensure patient/doctor AI route handlers only call platform AI facade (`src/app/api/patient/ai/chat/route.ts`, `src/app/api/doctor/ai/chat/route.ts`)
- [x] T060 [P] [US5] Document BAA gate env check in `src/lib/platform/ai.ts` (block prod PHI provider without gate)
- [x] T061 [P] [US5] Extend `AiAssistantPort` / stub adapter ping if missing in `src/ports/ai-assistant.ts`, `src/adapters/stub-ai.ts`

**Checkpoint**: AI provider + chat + clinical assistants gated centrally

---

## Phase 9: User Story 6 ? File Storage & Medical Document Management (Priority: P1)

**Goal**: Upload, malware scan job, ACL downloads, short-lived URLs; image optimization helper; signed docs immutable.

**Independent Test**: Upload ? PENDING ? CLEAN; unauthorized download denied; reject malware; ?15m URL.

### Tests for User Story 6

- [x] T062 [P] [US6] Unit test document ACL + fail-closed scan in `tests/unit/platform/documents.test.ts`
- [x] T063 [P] [US6] Integration test upload enqueues `MALWARE_SCAN` in `tests/integration/platform/upload-scan.test.ts`

### Implementation for User Story 6

- [x] T064 [US6] Implement `src/domain/platform/documents.ts` and facades `src/lib/platform/storage.ts`, `src/lib/platform/documents.ts`
- [x] T065 [US6] Implement `MALWARE_SCAN` job handler updating `PatientUpload.scanStatus` / clinical attachments
- [x] T066 [P] [US6] Shared upload UI `src/components/platform/upload/file-upload-field.tsx` + `use-upload.ts` polling scanStatus
- [x] T067 [P] [US6] Add image optimization utility (Next.js `Image` / resize constraints) in `src/lib/platform/image.ts` for allowed image types (no public bucket)
- [x] T068 [US6] Migrate patient upload flows to platform upload facade
- [x] T069 [US6] Enforce signed clinical document immutability in document update paths

**Checkpoint**: Storage + medical docs + image helper centralized

---

## Phase 10: User Story 7 — Video Consultation Sessions (Priority: P1)

**Goal**: Session create/join credentials; party authz; recording off by default. **Baseline done (T070–T075)**; full LiveKit Communication Service is **Phase 19**.

**Independent Test**: Patient + assigned doctor join; stranger denied; cancelled appointment refused.

### Tests for User Story 7

- [x] T070 [P] [US7] Unit test join authz rules in `tests/unit/platform/video.test.ts`
- [x] T071 [P] [US7] Integration test join credentials for appointment parties in `tests/integration/platform/video.test.ts`

### Implementation for User Story 7

- [x] T072 [US7] Implement `src/lib/platform/video.ts` (create session, getJoinCredentials, end)
- [x] T073 [US7] Migrate patient/doctor video join buttons to platform video facade
- [x] T074 [P] [US7] Ensure recording remains disabled via config/flag in `src/lib/platform/video.ts` + PlatformSetting key (Recording Support = off / future-ready)
- [x] T075 [P] [US7] Add optional stub video webhook route placeholder `src/app/api/webhooks/video/route.ts` (verify + no-op) if provider needs it

**Checkpoint**: Baseline video facade + stub adapter done. Continue Phase 19 for LiveKit Cloud, shared video UI, analytics, call logging.

---

## Phase 11: User Story 8 ? Shared Search (Priority: P2)

**Goal**: Doctor discovery projection + query-time bookable filter; Public/Patient consistency.

**Independent Test**: Search matches; suspended doctor excluded; refresh within freshness window after job.

### Tests for User Story 8

- [x] T076 [P] [US8] Unit test bookable filter / projection mapping in `tests/unit/platform/search.test.ts`
- [x] T077 [P] [US8] Perf test search query take/limit in `tests/perf/platform/search.perf.test.ts`

### Implementation for User Story 8

- [x] T078 [US8] Implement `src/domain/platform/search.ts` + `src/lib/platform/search.ts`
- [x] T079 [US8] Implement `SEARCH_REFRESH_DOCTOR` job handler writing `SearchDoctorProjection`
- [x] T080 [US8] Enqueue refresh on doctor approve/suspend/publish hooks in admin/CMS paths
- [x] T081 [US8] Migrate public/patient doctor search to platform search facade

**Checkpoint**: Search centralized

---

## Phase 12: User Story 9 ? Audit Logging & Activity Timeline (Priority: P1)

**Goal**: Distinct audit vs timeline; platform mutations audited; timeline derived for authorized viewers.

**Independent Test**: Refund/login denial audited; timeline shows appointment/doc events to owner; stranger denied.

### Tests for User Story 9

- [x] T082 [P] [US9] Unit test timeline visibility rules in `tests/unit/platform/timeline.test.ts`
- [x] T083 [P] [US9] Integration test audit write on platform refund/webhook deny in `tests/integration/platform/audit.test.ts`

### Implementation for User Story 9

- [x] T084 [P] [US9] Implement `src/lib/platform/audit.ts` thin wrap of `@/auth/audit` with platform event type constants
- [x] T085 [US9] Implement `src/lib/platform/timeline.ts` (derive feed from appointments/documents/prescriptions/notifications)
- [x] T086 [US9] Ensure high-impact platform mutations call audit facade (refunds, download denials, video deny, config)

**Checkpoint**: Logging streams separated and wired

---

## Phase 13: User Story 10 ? Localization for Shared Surfaces (Priority: P1)

**Goal**: EN/AR platform strings, RTL, Asia/Riyadh formatting helpers, Accept-Language default.

**Independent Test**: Switch locale on shared surface; AR RTL; SAR format; missing key falls back to EN.

### Tests for User Story 10

- [x] T087 [P] [US10] Unit test locale resolve + fallback in `tests/unit/platform/localization.test.ts`

### Implementation for User Story 10

- [x] T088 [P] [US10] Implement `src/domain/platform/localization.ts` + `src/lib/platform/localization.ts`
- [x] T089 [US10] Ensure platform components use `platform.*` / next-intl; format money/dates via shared helpers
- [x] T090 [P] [US10] Document anonymous default locale behavior in middleware or layout helper if not already aligned

**Checkpoint**: Localization centralized for shared surfaces

---

## Phase 14: User Story 11 ? Feature Flags & Configuration Management (Priority: P2)

**Goal**: Flags/settings via PlatformSetting; immediate effect; secrets masked; health pings for integrations.

**Independent Test**: Toggle flag ? capability denied; support email update audited; secret not shown.

### Tests for User Story 11

- [x] T091 [P] [US11] Unit test flag evaluation in `tests/unit/platform/flags.test.ts`
- [x] T092 [P] [US11] Integration test settings audit before/after in `tests/integration/platform/settings.test.ts`

### Implementation for User Story 11

- [x] T093 [US11] Implement `src/lib/platform/flags.ts` and `src/lib/platform/settings.ts` wrapping Admin PlatformSetting
- [x] T094 [US11] Extend health checks in `src/actions/admin/health.ts` / `src/lib/platform/health.ts` to ping Email/SMS/Storage/Payments/AI/Video adapters
- [x] T095 [P] [US11] Add PlatformSetting keys for push enabled, recording enabled (default false), BAA satisfied

**Checkpoint**: Config/flags/monitoring hooks ready

---

## Phase 15: User Story 12 ? Consuming Modules Use Shared Capabilities Only (Priority: P1)

**Goal**: Migrate remaining call sites; remove duplicate provider logic; inventory gate.

**Independent Test**: Grep shows no parallel private stacks for notify/pay/AI/file/video/search/email in product modules.

### Tests for User Story 12

- [x] T096 [P] [US12] Integration inventory/contract test listing required facades used in `tests/integration/platform/consumers.test.ts`

### Implementation for User Story 12

- [x] T097 [US12] Migrate Patient notification creates to `lib/platform/notifications` (`src/lib/patient/notifications.ts` thin wrap)
- [x] T098 [US12] Migrate Doctor notification triggers to platform facade (`src/lib/doctor/notification-triggers.ts`)
- [x] T099 [US12] Remove/avoid direct `stubPaymentsAdapter` usage outside `lib/platform` / adapters (update Patient webhook consumers)
- [x] T100 [US12] Update Admin/Patient/Doctor imports of Empty/Error/Skeleton to `@/components/platform` where touched
- [x] T101 [US12] Add architecture note to `specs/006-platform-services/quickstart.md` checklist confirming facade-only rule

**Checkpoint**: Cross-module reuse achieved

---

## Phase 16: Polish & Cross-Cutting (Definition of Done)

**Purpose**: Production readiness, perf, docs, DoD validation

- [x] T102 [P] Run full Vitest platform suites under `tests/unit/platform/` and `tests/integration/platform/`
- [x] T103 [P] Perf tests for jobs claim batch and search/notification hot paths in `tests/perf/platform/`
- [x] T104 [P] Optional Playwright smoke for upload/payment/notification shared UI in `tests/e2e/platform/smoke.spec.ts`
- [x] T105 Execute [quickstart.md](./quickstart.md) scenarios 1?12; record results in `specs/006-platform-services/quickstart-results.md`
- [x] T106 [P] Verify no secrets in sample operational logs (redaction review) using `src/lib/platform/redact.ts` tests
- [x] T107 Confirm DoD: reusable shared services; no duplicated business logic for listed concerns; centralized integrations; production-ready (cron secret, adapters, health, DLQ alerts)
- [x] T108 [P] Update [ui-review.md](./ui-review.md) with final component paths after consolidation

---

## Dependencies & Story Order

See **Dependencies (updated)** after Phase 19 for the current graph (includes LiveKit Phase 19). Historical US1–US13 order: Foundation → Notifications → Payments+Jobs → AI/Storage/Video baseline → Search/Audit/i18n/Flags → US12 migration → Phase 17–18 → **Phase 19 LiveKit** → DoD.

---

## Phase 17: Convergence

**Purpose**: Close gaps between spec/plan/tasks and current Platform Services implementation (post /speckit-implement).

### CRITICAL / HIGH

- [x] T109 HIGH: Route Auth transactional emails (register, verify, password reset, doctor invite, admin invite) through `src/lib/platform/email.ts` instead of direct `sendAuthEmail` in `src/actions/auth/*.ts` per FR-025 / SC-002 / US2 (partial)
- [x] T110 HIGH: Migrate Patient doctor search in `src/actions/patient/doctors.ts` to `src/lib/platform/search.ts` (`SearchDoctorProjection` + query-time bookable filter) and align Public `/[locale]/doctors` discovery with the same bookable membership rules per FR-018 / SC-007 / US8 (partial)
- [x] T111 HIGH: Enqueue `SEARCH_REFRESH_DOCTOR` via `enqueueDoctorSearchRefresh` on doctor approve, reject, suspend, and CMS publish/availability changes in `src/actions/auth/admin.ts` / `src/actions/admin/doctors.ts` (and related CMS paths) per FR-037 / SC-016 (missing)
- [x] T112 HIGH: Wire Patient `src/components/patient/appointments/video-consultation.tsx` to platform `createConsultationSession` / `getJoinCredentials` (authorized join, not disabled stub) per FR-016 / US7/AC1 (partial)
- [x] T113 HIGH: On `failJob` dead-letter (`BackgroundJob` state FAILED after max attempts), notify admins / raise health signal for critical job types in `src/domain/platform/jobs.ts` or `src/lib/platform/jobs.ts` per FR-041 / SC-015 (partial)

### MEDIUM

- [x] T114 MEDIUM: Enforce Auth-compatible outbound email rate limiting (and `RATE_LIMITED` outcome) in `src/lib/platform/email.ts` per FR-005 (partial)
- [x] T115 MEDIUM: Report Email, SMS, and Storage as distinct System Health component signals (extend `HealthComponentKey` and `runHealthChecks` as needed) instead of only folding into APP message in `src/actions/admin/health.ts` per FR-039 / SC-018 (partial)
- [x] T116 MEDIUM: Enforce signed clinical document immutability (no silent overwrite) in `src/lib/platform/documents.ts` / related update paths per FR-015 (partial)
- [x] T117 MEDIUM: Wire `getPatientTimeline` from `src/lib/platform/timeline.ts` into Patient and/or Doctor timeline UI surfaces per FR-021 / US9 (partial)
- [x] T118 MEDIUM: Update Admin (and other touched) Empty/Error/Skeleton imports to `@/components/platform` per US12 / T100 (partial)
- [x] T119 MEDIUM: Export approved Stitch shared UI screens into `specs/006-platform-services/design/` and set `exported: true` in `manifest.json` per FR-002 / SC-013 / plan:T008 (partial)

### LOW

- [x] T120 [P] LOW: Add unit tests for `redactSecrets` / `redactErrorMessage` in `tests/unit/platform/redact.test.ts` per SC-017 (partial)
- [x] T121 LOW: Execute remaining manual [quickstart.md](./quickstart.md) scenarios 1-12 against a running app and update `specs/006-platform-services/quickstart-results.md` per T105 / DoD (partial)

**Checkpoint**: After /speckit-implement on Phase 17, re-run /speckit-converge to confirm closure.

## Phase 18: Convergence

**Purpose**: Close remaining gaps after Phase 17 implement (design honesty, adapter wiring, malware fail-closed, consumer bypasses).

### HIGH

- [x] T122 HIGH: Route `src/lib/platform/sms.ts` sync send through `getSmsAdapter()` (not hard-coded `stubSmsSend`) and preserve OutboundMessage status semantics per FR-006 / US2 (partial)
- [x] T123 HIGH: Route `src/lib/platform/push.ts` through `getPushAdapter()`, unify `PUSH_ENABLED` vs `PLATFORM_PUSH_ENABLED` / `isPlatformPushEnabled`, and ensure an authenticated client can call `src/actions/platform/push-devices.ts` per FR-007 / US3 (partial)
- [x] T124 HIGH: Fail-closed `src/app/api/webhooks/video/route.ts` when `VIDEO_WEBHOOK_SECRET` is set but signature is missing/invalid (do not accept unsigned) per FR-042 (partial)
- [x] T125 HIGH: Migrate `src/app/api/patient/uploads/route.ts` and patient/doctor document download routes to platform storage/documents (PENDING + `MALWARE_SCAN` job; fail-closed until CLEAN; no direct `localStorageAdapter` / sync CLEAN) per FR-014 / FR-025 / FR-034 (contradicts)
- [x] T126 HIGH: Fix `src/adapters/stub-email.ts` to send via `getEmailSender()` (or equivalent) without calling `sendAuthEmail`, preserving caller `idempotencyKey`/`purpose` so job retries do not create nested OutboundMessage rows per FR-030 (partial)
- [x] T127 HIGH: Route Doctor AI chat in `src/actions/doctor/ai.ts` through `src/lib/platform/ai.ts` (and keep safety checks behind shared ports) instead of importing `stubAiAssistantAdapter` directly per FR-025 / US5 / US12 (partial)
- [x] T128 HIGH: Correct Stitch design export honesty ? replace 1�1 placeholder PNGs in `specs/006-platform-services/design/` with real Stitch exports when MCP auth available, or set `exported: false` and clear fake `file` claims in `manifest.json` per FR-002 / SC-013 / T119 (contradicts)

### MEDIUM

- [x] T129 MEDIUM: Enforce bookable eligibility on Public `/[locale]/doctors` when projection is empty (fail closed or hydrate projections) and align `getDoctorBySlug` with bookable rules in `src/actions/patient/doctors.ts` per FR-018 / US8 (partial)
- [x] T130 MEDIUM: Ensure signed clinical storage overwrite cannot bypass immutability ? wire callers through `replaceClinicalDocumentContent` / `assertSignedArtifactMutable` (or remove dead API) in `src/lib/platform/documents.ts` per FR-015 (partial)
- [x] T131 MEDIUM: Implement real image resize/optimize helper in `src/lib/platform/image.ts` (beyond MIME allowlist) for allowed image uploads per plan:T067 (partial)
- [x] T132 MEDIUM: Migrate Admin/portal SAR/locale formatting to `src/lib/platform/localization.ts` (`formatSar` / `resolveLocale`) instead of local duplicates per FR-022 / FR-025 (partial)
- [x] T133 MEDIUM: Honor platform feature flags (`isPlatformPushEnabled` and AI flags via platform facade) in `src/lib/platform/notifications.ts` and Doctor AI paths per FR-023 (partial)

### LOW

- [x] T134 LOW: Align `specs/006-platform-services/quickstart-results.md` with actual evidence (design export status, operator E2E still optional) per T121 / DoD (partial)

**Checkpoint**: After /speckit-implement on Phase 18, re-run /speckit-converge to confirm closure.

---

## Phase 19: Video Communication Service — LiveKit (US7 extension) 🎯 OPEN

**Goal**: Complete shared **Video Communication Service** on **LiveKit Cloud** + Server SDK + React Components + WebRTC per updated [plan.md](./plan.md). Patient and Doctor portals consume shared facades/UI only; Admin monitors sessions/analytics/call logs; **no LiveKit business logic in portals**.

**Independent Test**: With `TELEMEDICINE_ADAPTER=livekit`, authorized patient+doctor join via shared waiting room → preview → in-call grid/controls; stranger denied; reconnect recovers; Admin sees call events; recording stays off unless flag enabled; grep shows no `livekit-server-sdk` under patient/doctor component trees.

**Depends on**: Phase 2 foundation + US7 baseline (T070–T075) + US11 flags/health.

### Setup / deps

- [x] T135 [P] [US7] Add npm deps `livekit-server-sdk`, `@livekit/components-react`, and LiveKit client packages to `package.json`; document `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `TELEMEDICINE_ADAPTER=livekit|stub`, `VIDEO_WEBHOOK_SECRET` in `.env.example`
- [x] T136 [P] [US7] Extend Prisma with `VideoSession` and `VideoCallEvent` per [data-model.md](./data-model.md); add migration under `prisma/migrations/`
- [x] T137 [P] [US7] Add `platform.video.*` (and AI shell) message keys to `src/i18n/messages/en.json` and `src/i18n/messages/ar.json`

### Tests (unit / integration / perf / security / e2e)

- [x] T138 [P] [US7] Unit test LiveKit JWT TTL + role grants helpers in `tests/unit/platform/livekit-token.test.ts`
- [x] T139 [P] [US7] Unit test session state machine (SCHEDULED→WAITING→IN_CALL→ENDED) in `tests/unit/platform/video-session.test.ts`
- [x] T140 [P] [US7] Integration test LiveKit adapter (or recorded fixture) room create + token in `tests/integration/platform/livekit.test.ts` (skip if no LiveKit env)
- [x] T141 [P] [US7] Security test: portals must not import `livekit-server-sdk`; JWT mint only via `src/lib/platform/video.ts` — assert in `tests/unit/platform/video-boundary.test.ts`
- [x] T142 [P] [US7] Security/integration test video webhook invalid signature + stale skew leaves session unchanged in `tests/integration/platform/video-webhook.test.ts`
- [x] T143 [P] [US7] Perf smoke: token issue p95 budget under load harness in `tests/perf/platform/video-token.perf.test.ts`
- [x] T144 [P] [US7] E2E smoke (Playwright): patient waiting room → join shell mounts shared platform video in `tests/e2e/platform/video-consultation.spec.ts` (stub adapter acceptable in CI)

### LiveKit Integration & port

- [x] T145 [US7] Extend `src/ports/telemedicine.ts` with optional `closeRoom`, `startRecording`/`stopRecording`, `ping` per [contracts/platform-services.md](./contracts/platform-services.md)
- [x] T146 [US7] Implement `src/adapters/livekit-telemedicine.ts` (LiveKit Cloud room create/delete, AccessToken JWT, optional egress, ping)
- [x] T147 [US7] Wire `getTelemedicineAdapter()` in `src/adapters/index.ts` to select LiveKit when `TELEMEDICINE_ADAPTER=livekit`
- [x] T148 [P] [US7] Keep `src/adapters/stub-telemedicine.ts` compatible with extended port for CI/local

### Room / JWT / Session Management

- [x] T149 [US7] Implement session domain in `src/domain/platform/video.ts` (VideoSession lifecycle, waiting-room policy, participant roster rules)
- [x] T150 [US7] Extend `src/lib/platform/video.ts` for createConsultationSession / getJoinCredentials / endConsultationSession / listVideoCallEvents / getSessionAnalytics per contracts
- [x] T151 [P] [US7] Add Server Actions in `src/actions/platform/video.ts` for token/session (callable from Patient/Doctor islands)
- [x] T152 [US7] Persist join/leave/deny/reconnect events as `VideoCallEvent` from facade + webhook handlers

### Shared Video UI (Stitch — do not redesign)

- [x] T153 [P] [US7] Create `src/components/platform/video/waiting-room.tsx` aligned with Stitch Waiting Room
- [x] T154 [P] [US7] Create `src/components/platform/video/camera-preview.tsx`
- [x] T155 [P] [US7] Create `src/components/platform/video/device-selector.tsx`
- [x] T156 [P] [US7] Create `src/components/platform/video/participant-grid.tsx` wrapping LiveKit React Components
- [x] T157 [P] [US7] Create `src/components/platform/video/call-controls.tsx` (audio, video, screen share, in-call chat toggles)
- [x] T158 [US7] Create `src/components/platform/video/session-shell.tsx` (Room connect + connection recovery / reconnect UX)
- [x] T159 [P] [US7] Export video kit from `src/components/platform/index.ts` and `src/components/platform/video/index.ts`
- [x] T160 [P] [US7] Implement `src/hooks/platform/use-video-session.ts` (fetch JWT via Server Action; expose connection state; never hold API secrets)

### Portal consumption (no LiveKit logic in portals)

- [x] T161 [US7] Refactor `src/components/patient/appointments/video-consultation.tsx` to mount shared `VideoSessionShell` / waiting room only
- [x] T162 [US7] Refactor doctor video page `src/app/[locale]/doctor/consultations/[appointmentId]/video/page.tsx` (+ join button) to shared platform video components only
- [x] T163 [P] [US7] Grep/enforce: no `livekit-server-sdk` under `src/components/patient/**` or `src/components/doctor/**`

### Participant / Device / Controls / Chat / Recovery

- [x] T164 [US7] Enforce participant management (patient + assigned doctor only) in domain before token mint; audit denials via `src/lib/platform/audit.ts`
- [x] T165 [P] [US7] Wire device management + camera preview into waiting room flow (pre-join)
- [x] T166 [P] [US7] Wire audio/video/screen-share controls through shared `call-controls.tsx`
- [x] T167 [P] [US7] Wire ephemeral in-call chat UI wrapper in platform video (no full chat bodies in audit/ops logs)
- [x] T168 [US7] Implement connection recovery in `session-shell.tsx` (reconnect + re-fetch JWT when expired if still authorized)

### Recording (optional) / Analytics / Call Logging / Admin

- [x] T169 [US7] Implement optional recording path (LiveKit egress) gated by `isPlatformVideoRecordingEnabled` in `src/lib/platform/video.ts` + `VIDEO_RECORDING_FINALIZE` job type in `src/domain/platform/jobs.ts` (default off)
- [x] T170 [US7] Implement Admin-facing session analytics summary in `src/lib/platform/video.ts` (`getSessionAnalytics`) and surface in Admin health/ops UI path (e.g. `src/components/admin/` or existing AI Operations / health area — no redesign)
- [x] T171 [US7] Expose call logging list for Admin (and authorized parties) via facade + thin Admin view consuming platform only
- [x] T172 [US7] Harden `src/app/api/webhooks/video/route.ts` for LiveKit webhook signature + ≤5m skew + idempotent `WebhookReceipt`; enqueue side effects

### Shared AI components (plan UI validation)

- [x] T173 [P] [US7] Add shared AI chrome shells under `src/components/platform/ai/` (assistant shell / disclaimer) per [contracts/ui.md](./contracts/ui.md); Patient/Doctor AI pages import shell only (no redesign)

### Health / monitoring / logging

- [x] T174 [US7] Extend `src/lib/platform/health.ts` / Admin health to ping LiveKit adapter when configured (TELEMEDICINE component)
- [x] T175 [P] [US7] Ensure operational logs for video redact tokens/media; call events use redacted metadata via `src/lib/platform/redact.ts`

### DoD checks for Phase 19

- [x] T176 [US7] Update [quickstart.md](./quickstart.md) scenario 7 evidence in `specs/006-platform-services/quickstart-results.md` for LiveKit path
- [x] T177 Update `specs/006-platform-services/design/manifest.json` video/AI screen entries after shared components land (exported remains honest)

**Checkpoint**: LiveKit Video Communication Service centralized; Patient/Doctor consume shared UI; Admin monitors; recording optional/off; tests green for authz + webhook security + boundary.

---

## Dependencies (updated)

```text
Phase 1 Setup → Phase 2 Foundation
  → US1 In-app → US2 Email/SMS → US3 Push
  → US4 Payments → US13 Jobs/Webhooks
  → US5 AI | US6 Storage | US7 baseline
  → US8 Search | US9 Audit/Timeline | US10 i18n | US11 Flags/Health
  → US12 Consumer migration
  → Phase 17–18 Convergence (done)
  → Phase 19 LiveKit Video Communication (OPEN) ← after US7 baseline + US11
  → Polish / DoD
```

**Parallel (Phase 19)**: T135–T137, T138–T144 tests, T153–T157 UI components can run in parallel after T145–T148 adapter exists; T161–T162 after T158–T160.

## Parallel example (Phase 19)

```bash
# After T146 LiveKit adapter
T153 T154 T155 T156 T157   # shared video UI in parallel
T138 T139 T141             # unit/security tests in parallel
```

## Implementation strategy (remaining)

1. **Done**: Foundation, notifications, payments, AI, storage, search, audit/timeline, i18n, flags, jobs/webhooks, consumer migration (T001–T134).
2. **Next MVP slice**: Phase 19 T135–T152 (LiveKit adapter + session/JWT) + T153–T163 (shared UI + portal mount).
3. **Then**: recording optional, analytics, Admin call logs, webhook harden, security/e2e tests, DoD evidence.

## Suggested MVP scope (remaining)

T135–T163 + T164 + T168 + T172 + T141 + T144 — LiveKit join path reusable across Patient/Doctor with shared UI and security boundary.

## Format validation

All tasks use `- [ ]` / `- [x]`, sequential `Tnnn`, optional `[P]`, story `[USn]` on story phases only, and include explicit file paths.

## Definition of Done checklist

- [ ] Shared services reusable across all modules (facades only)
- [ ] LiveKit integrated and reusable (adapter + shared video kit)
- [ ] AI services centralized (`lib/platform/ai` + shared AI chrome)
- [ ] Notification services operational (in-app/email/SMS/push)
- [ ] Payment services operational (gateway/billing/refunds)
- [ ] No duplicated business logic (no portal-local LiveKit/payment/AI vendor stacks)
- [ ] Production ready (quickstart + health + webhook verify + tests)

## Phase 20: Convergence

**Purpose**: Close remaining gaps after Phase 19 LiveKit implement (FR-044–048 residual + US12 safety-check facade + Admin call-log UI + video redaction).

### HIGH

- [x] T178 HIGH: Enforce payment webhook timestamp freshness skew (default <=5 minutes) in `src/app/api/webhooks/payments/route.ts` and/or `src/lib/platform/payments.ts` / `src/domain/platform/webhooks.ts`; reject stale signed events with no billing state change; persist `freshnessValid` on `WebhookReceipt` when applicable per FR-045 / SC-019 (missing)
- [x] T179 HIGH: Add abuse-oriented rate limiting for public/anonymous doctor discovery in `src/lib/platform/search.ts` (return `RATE_LIMITED`) and ensure Public `src/app/[locale]/doctors` / Patient doctor search honor it without blocking normal browsing per FR-046 / SC-020 (missing)
- [x] T180 HIGH: Enforce per-type soft concurrency bounds when claiming `BackgroundJob` rows in `src/domain/platform/jobs.ts` (env-configurable) so cron ticks cannot thundering-herd providers per FR-048 / plan:queue strategy (missing)
- [x] T181 HIGH: Route Doctor prescription safety checks through a platform facade/port (do not import `stubSafetyCheckAdapter` directly from `src/actions/doctor/prescriptions.ts`) per FR-025 / US12 (partial)

### MEDIUM

- [x] T182 MEDIUM: Add thin Admin call-log UI consuming `listVideoCallEvents` / `platformListVideoCallEvents` (e.g. under Admin health/ops) so session analytics is not the only Admin video monitor surface per plan:Video Call Logging / US7 (partial)
- [x] T183 MEDIUM: Apply `src/lib/platform/redact.ts` when writing video operational logs / `VideoCallEvent` metadata in `src/lib/platform/video.ts` and webhook handlers so tokens/media never land in diagnostics per FR-038 / T175 (partial)
- [x] T184 MEDIUM: Implement or document enforceable operational-diagnostic retention (>=30 days accessible, distinct from audit >=365d) via platform policy/job or host config check referenced from `src/lib/platform/` per FR-047 (missing)
- [x] T185 MEDIUM: Add HTTPS/TLS assertion helper for provider base URLs and download link issuance in `src/lib/platform/` (reject non-HTTPS in production) per FR-044 (partial)

**Checkpoint**: After `/speckit-implement` on Phase 20, re-run `/speckit-converge` to confirm closure.

## Phase 21: Convergence

**Purpose**: Close remaining gap after Phase 20 implement — public discovery must honor `RATE_LIMITED` end-to-end (no CMS bypass).

### HIGH

- [x] T186 HIGH: When platform search returns `RATE_LIMITED` on Public `src/app/[locale]/doctors/page.tsx`, do not fall back to unrestricted CMS `listDoctors` results; show a throttled/empty/retry outcome and only filter or render discovery hits when search succeeds per FR-046 / SC-020 / T179 (partial)
