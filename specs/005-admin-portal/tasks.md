# Tasks: Administration Portal & Platform Management

**Input**: Design documents from `/specs/005-admin-portal/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [ui-review.md](./ui-review.md), [quickstart.md](./quickstart.md)

**Tests**: Included (user requested unit, integration, accessibility, performance).

**UI gate**: Export Stitch admin screens to `specs/005-admin-portal/design/` before pixel UI tasks (see T019). Do not redesign. Domain/API/Prisma may proceed without assets.

**Organization**: Setup Ã¢â€ â€™ Foundational (layout/sidebar/nav/schema/RBAC) Ã¢â€ â€™ US1Ã¢â‚¬â€œUS13 by priority Ã¢â€ â€™ Polish (DoD)

**Definition of Done** (validate in Polish): Administrators can manage the platform; RBAC fully enforced; billing and analytics operational; AI operations monitored; audit logging implemented; production-ready checks from [quickstart.md](./quickstart.md).

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable (different files, no incomplete deps)
- **[Story]**: [US1]Ã¢â‚¬Â¦[US13] for story phases only

## Path Conventions

Single Next.js app: `src/`, `prisma/`, `tests/` at repository root (extends Modules 0Ã¢â‚¬â€œ3).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folders, i18n, env docs, test harness

- [x] T001 Confirm `@tanstack/react-query` present in `package.json` (reuse; add if missing)
- [x] T002 [P] Document admin-portal env vars (export caps, health ping toggles) in `.env.example`
- [x] T003 Create folder skeleton: `src/actions/admin/`, `src/components/admin/{shell,dashboard,users,doctors,appointments,ai,billing,revenue,analytics,settings,health,audit,notifications,roles,shared}/`, `src/domain/admin/`, `src/lib/admin/`
- [x] T004 [P] Add `admin.*` message namespaces to `src/i18n/messages/en.json` and `src/i18n/messages/ar.json`
- [x] T005 [P] Create test folders `tests/unit/admin/`, `tests/integration/admin/`, `tests/e2e/admin/`, `tests/a11y/admin/`, `tests/perf/admin/`
- [x] T006 [P] Add stub route placeholders under `src/app/[locale]/admin/` for users, doctors, appointments, ai, billing, revenue, analytics, settings, health, audit, notifications, roles (pages can return Ã¢â‚¬Å“coming soonÃ¢â‚¬Â until story wires them)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Prisma extensions, RBAC permissions, admin helpers, shell (layout/sidebar/nav/header), shared primitives, migrate Auth admin actions Ã¢â‚¬â€ MUST complete before story features

**Ã¢Å¡Â Ã¯Â¸Â CRITICAL**: No user story work until this phase completes (except T019 design import can run in parallel with backend)

- [x] T007 Extend `prisma/schema.prisma` enums per [data-model.md](./data-model.md) (`PaymentStatus` PARTIALLY_REFUNDED/DISPUTED, notification categories SECURITY/HEALTH/AI_GOVERNANCE/ADMIN_OPS, `HealthOverallStatus`, `HealthComponentKey`, `AnnouncementSegment`, `PlatformSettingValueType`)
- [x] T008 Extend `PaymentObligation` with refund/dispute fields; add optional AI-disable fields on `User` or `UserAiRestriction` model in `prisma/schema.prisma`
- [x] T009 Add Prisma models `PlatformSetting`, `SystemHealthSnapshot`, `AiFlaggedConversation`, `PlatformAnnouncement` in `prisma/schema.prisma`
- [x] T010 Create and apply Prisma migration under `prisma/migrations/` for admin-portal schema
- [x] T011 Extend seed in `prisma/seed.ts`: ensure Active ADMIN; pending doctor; sample payments (PAID); sample audit events; seed default `PlatformSetting` keys (maintenance off, AI toggles on)
- [x] T012 [P] Expand ADMIN permissions in `src/auth/rbac.ts` per [plan.md](./plan.md) (`admin:portal:access`, appointments, billing, ai, settings, health, analytics, notifications, roles Ã¢â‚¬â€ keep existing users/doctors/audit)
- [x] T013 [P] Implement `requireAdmin` / `withAdmin` helpers in `src/actions/admin/_helpers.ts` (Active ADMIN + permission; map AuthDomainError; audit denials)
- [x] T014 [P] Implement domain stubs in `src/domain/admin/{dashboard,user-lifecycle,doctor-approval,billing,ai-governance,settings,health,analytics,audit}.ts`
- [x] T015 [P] Migrate/re-export existing `src/actions/auth/admin.ts` into `src/actions/admin/{doctors,users,roles}.ts` with stable re-exports from auth path to avoid breakages
- [x] T016 [P] Implement shared admin UI primitives `EmptyState`, `ErrorState`, `ListSkeleton`, `WidgetSkeleton`, `Pagination`, `SearchFilterBar`, `StatusBadge`, `ConfirmReasonDialog`, `KpiCard`, `DataTable` in `src/components/admin/shared/`
- [x] T017 [P] Implement `AdminPortalShell`, `AdminSidebar`, `AdminNav`, `AdminHeader` (bell, locale, profile/sign-out) in `src/components/admin/shell/` per [contracts/ui.md](./contracts/ui.md)
- [x] T018 Upgrade `src/app/[locale]/admin/layout.tsx` to wrap with `AdminPortalShell` + `RoleLayoutGate("ADMIN")` + React Query provider; replace interim marketing-margin layout
- [x] T019 [P] Import approved Stitch admin screens into `specs/005-admin-portal/design/` (update [design/manifest.json](./design/manifest.json) + [ui-review.md](./ui-review.md)) Ã¢â‚¬â€ **pixel UI tasks blocked until done**
- [x] T020 [P] Confirm marketing chrome hidden on `/admin/*` via `src/lib/auth-routes.ts` (`admin` already in `PORTAL_SHELL_SEGMENTS`; fix gaps)
- [x] T021 [P] Add maintenance-mode gate for non-admin surfaces in middleware or layout helper reading `PlatformSetting` (`src/lib/admin/maintenance.ts`)
- [x] T022 [P] Extend audit helper wrappers for admin event types in `src/lib/admin/audit.ts` (reuse `auditLog` from `@/auth/audit`)

**Checkpoint**: Foundation ready Ã¢â‚¬â€ stories can proceed (pixel UI after T019)

---

## Phase 3: User Story 1 Ã¢â‚¬â€ Secure Admin Entry & Shell (Priority: P1)

**Goal**: Only Active Administrators access admin routes; shell matches Stitch; idle 15m; EN/AR RTL; non-admins denied + audited.

**Independent Test**: Admin lands in shell; Patient/Doctor/anonymous denied; AR RTL; idle expiry ends session.

### Tests for User Story 1

- [x] T023 [P] [US1] Unit test permission matrix includes `admin:portal:access` for ADMIN only in `tests/unit/admin/rbac.test.ts`
- [x] T024 [P] [US1] Integration test non-admin denied on admin action helper in `tests/integration/admin/access-denied.test.ts`
- [x] T025 [P] [US1] E2E smoke: admin shell loads / patient denied in `tests/e2e/admin/access.spec.ts`

### Implementation for User Story 1

- [x] T026 [US1] Wire access-denied auditing for admin layout/actions in `src/actions/admin/_helpers.ts` and `src/auth/role-layout.ts` as needed
- [x] T027 [P] [US1] Ensure sign-out control in `src/components/admin/shell/admin-header.tsx`
- [x] T028 [P] [US1] Verify/fix Arabic RTL chrome for admin shell classes in `src/components/admin/shell/`
- [x] T029 [US1] Replace stub `src/app/[locale]/admin/page.tsx` interim content with shell-hosted dashboard placeholder ready for US2 widgets

**Checkpoint**: Secure shell entry works; MVP continues with dashboard

---

## Phase 4: User Story 2 Ã¢â‚¬â€ Admin Dashboard Overview (Priority: P1) Ã°Å¸Å½Â¯ MVP

**Goal**: Dashboard KPIs (patients, doctors, active appointments, revenue, AI usage, platform status, pending approvals, recent activities, notifications) + Quick Actions; widget isolation.

**Independent Test**: Seeded admin opens `/en/admin`; widgets load or empty/error independently; quick actions navigate correctly.

### Tests for User Story 2

- [x] T030 [P] [US2] Unit test dashboard aggregations / active-appointment filter in `tests/unit/admin/dashboard.test.ts`
- [x] T031 [P] [US2] Integration test `getDashboardSnapshot` widget isolation (`allSettled`) in `tests/integration/admin/dashboard.test.ts`
- [x] T032 [P] [US2] Perf assert widget query `take`/caps in `tests/perf/admin/dashboard-caps.perf.test.ts`

### Implementation for User Story 2

- [x] T033 [US2] Implement `getDashboardSnapshot` with `Promise.allSettled` in `src/actions/admin/dashboard.ts` + `src/domain/admin/dashboard.ts` + `src/lib/admin/dashboard.ts`
- [x] T034 [P] [US2] Build `DashboardGrid` layout in `src/components/admin/dashboard/dashboard-grid.tsx` per Stitch
- [x] T035 [P] [US2] Implement platform statistics widgets (Total Patients, Total Doctors, Active Appointments) in `src/components/admin/dashboard/stats-widgets.tsx`
- [x] T036 [P] [US2] Implement Revenue Summary + AI Usage Metrics widgets in `src/components/admin/dashboard/revenue-widget.tsx` and `ai-metrics-widget.tsx`
- [x] T037 [P] [US2] Implement Platform Status + Pending Doctor Approvals widgets in `src/components/admin/dashboard/platform-status-widget.tsx` and `pending-approvals-widget.tsx`
- [x] T038 [P] [US2] Implement Recent Activities + Notifications widgets in `src/components/admin/dashboard/recent-activities-widget.tsx` and `notifications-widget.tsx`
- [x] T039 [P] [US2] Implement Quick Actions bar (Approve Doctor, Suspend User, Analytics, Settings, AI Ops, Audit) in `src/components/admin/dashboard/quick-actions.tsx`
- [x] T040 [US2] Wire `src/app/[locale]/admin/page.tsx` to full dashboard grid + empty/error/skeleton states

**Checkpoint**: MVP dashboard usable for administrators

---

## Phase 5: User Story 3 Ã¢â‚¬â€ User Management (Priority: P1)

**Goal**: Search/filter users; suspend/reinstate/deactivate/unlock/revoke sessions with reasons; no self-suspend; no hard PHI delete.

**Independent Test**: Suspend test user Ã¢â€ â€™ cannot sign in + audit; reinstate; self-suspend blocked.

### Tests for User Story 3

- [x] T041 [P] [US3] Unit test last-admin/self-suspend guards in `tests/unit/admin/user-lifecycle.test.ts`
- [x] T042 [P] [US3] Integration test suspend revokes sessions in `tests/integration/admin/user-suspend.test.ts`

### Implementation for User Story 3

- [x] T043 [US3] Implement user-lifecycle domain rules in `src/domain/admin/user-lifecycle.ts`
- [x] T044 [US3] Implement list/get/suspend/reinstate/deactivate/unlock/revokeSessions actions in `src/actions/admin/users.ts`
- [x] T045 [P] [US3] Build `UserTable` + filters in `src/components/admin/users/user-table.tsx`
- [x] T046 [P] [US3] Build user detail + `ConfirmReasonDialog` actions in `src/components/admin/users/user-detail.tsx`
- [x] T047 [US3] Wire `src/app/[locale]/admin/users/page.tsx` and `src/app/[locale]/admin/users/[userId]/page.tsx`

**Checkpoint**: User lifecycle operable from admin UI

---

## Phase 6: User Story 4 Ã¢â‚¬â€ Doctor Management & Approvals (Priority: P1)

**Goal**: Pending queue; approve/reject (idempotent); suspend approved doctors (unbookable + revoke sessions); notify applicants.

**Independent Test**: Approve Ã¢â€ â€™ bookable + invite; reject with reason; re-approve idempotent; suspend blocks new bookings.

### Tests for User Story 4

- [x] T048 [P] [US4] Unit test approve/reject idempotency in `tests/unit/admin/doctor-approval.test.ts`
- [x] T049 [P] [US4] Integration test approve sets APPROVED/ACTIVE + audit in `tests/integration/admin/doctor-approve.test.ts`

### Implementation for User Story 4

- [x] T050 [US4] Implement doctor-approval domain + public bookable side effects in `src/domain/admin/doctor-approval.ts`
- [x] T051 [US4] Complete create/approve/reject/suspendDoctor actions in `src/actions/admin/doctors.ts` (reuse Auth flows)
- [x] T052 [P] [US4] Build pending queue + doctor table UI in `src/components/admin/doctors/`
- [x] T053 [US4] Wire `src/app/[locale]/admin/doctors/page.tsx` and `src/app/[locale]/admin/doctors/[userId]/page.tsx`; deep-link from dashboard pending widget

**Checkpoint**: Doctor onboarding controlled by admins

---

## Phase 7: User Story 5 Ã¢â‚¬â€ Appointment Oversight (Priority: P2)

**Goal**: Cross-platform appointment monitor; ops detail; cancel/flag with audit; no clinical editor.

**Independent Test**: Filter todayÃ¢â‚¬â„¢s appointments; cancel with reason Ã¢â€ â€™ notified + audited; no SOAP UI.

### Tests for User Story 5

- [x] T054 [P] [US5] Unit test ops cancel eligibility in `tests/unit/admin/appointment-ops.test.ts`
- [x] T055 [P] [US5] Integration test cancelAppointmentAdmin audits in `tests/integration/admin/appointment-cancel.test.ts`

### Implementation for User Story 5

- [x] T056 [US5] Implement appointment ops list/get/cancel/flag in `src/actions/admin/appointments.ts` + domain helper
- [x] T057 [P] [US5] Build `AppointmentOpsTable` + detail (ops fields only) in `src/components/admin/appointments/`
- [x] T058 [US5] Wire `src/app/[locale]/admin/appointments/page.tsx` and `[id]/page.tsx`

**Checkpoint**: Ops can monitor/cancel appointments without clinical editing

---

## Phase 8: User Story 6 Ã¢â‚¬â€ AI Operations Monitoring (Priority: P2)

**Goal**: AI usage metrics, events/logs, global toggles, per-user AI disable, flagged conversation review.

**Independent Test**: Disable global AI Ã¢â€ â€™ end-user blocked; disable one user; review flag without altering signed clinical artifacts.

### Tests for User Story 6

- [x] T059 [P] [US6] Unit test AI fail-closed when disabled in `tests/unit/admin/ai-governance.test.ts`
- [x] T060 [P] [US6] Integration test toggle persists PlatformSetting + audit in `tests/integration/admin/ai-toggle.test.ts`

### Implementation for User Story 6

- [x] T061 [US6] Implement AI governance domain + `getAiOpsSnapshot` / toggles / disableUserAi / flag review in `src/actions/admin/ai-ops.ts` and `src/domain/admin/ai-governance.ts`
- [x] T062 [P] [US6] Enforce global/per-user AI gates in patient/doctor AI entry points (`src/actions/**/ai*.ts` or ports) reading settings/restrictions
- [x] T063 [P] [US6] Build AI Operations dashboard (usage, logs/events, toggles, flags) in `src/components/admin/ai/`
- [x] T064 [US6] Wire `src/app/[locale]/admin/ai/page.tsx`

**Checkpoint**: AI operations monitored and governable

---

## Phase 9: User Story 7 Ã¢â‚¬â€ Billing, Payments & Revenue (Priority: P2)

**Goal**: Transaction list/detail; full/partial refunds; disputes; revenue summary.

**Independent Test**: Partial then full refund; over-refund blocked; revenue gross/refunds/net for period.

### Tests for User Story 7

- [x] T065 [P] [US7] Unit test refundable balance rules in `tests/unit/admin/billing-refund.test.ts`
- [x] T066 [P] [US7] Integration test refund updates status + audit in `tests/integration/admin/refund.test.ts`

### Implementation for User Story 7

- [x] T067 [US7] Implement billing domain + list/get/refund/dispute/revenueSummary in `src/actions/admin/billing.ts`, `src/actions/admin/revenue.ts`, `src/domain/admin/billing.ts`
- [x] T068 [P] [US7] Optional `PaymentPort.refund` adapter stub in `src/ports/` + `src/adapters/` (manual settlement fallback)
- [x] T069 [P] [US7] Build Billing dashboard + Transaction table/detail in `src/components/admin/billing/`
- [x] T070 [P] [US7] Build Revenue summary UI in `src/components/admin/revenue/`
- [x] T071 [US7] Wire `src/app/[locale]/admin/billing/page.tsx`, `billing/[obligationId]/page.tsx`, `revenue/page.tsx`

**Checkpoint**: Billing and revenue operational for admins

---

## Phase 10: User Story 8 Ã¢â‚¬â€ Reports & Analytics (Priority: P2)

**Goal**: Analytics hub (users/doctors/appointments/revenue/AI) by period; CSV export Ã¢â€°Â¤10k; appointment analytics included.

**Independent Test**: Select 30d Ã¢â€ â€™ charts update; export CSV audited; empty period empty-state; over-cap Ã¢â€ â€™ EXPORT_TOO_LARGE.

### Tests for User Story 8

- [x] T072 [P] [US8] Unit test period aggregation helpers in `tests/unit/admin/analytics.test.ts`
- [x] T073 [P] [US8] Integration test export row-cap in `tests/integration/admin/export-cap.test.ts`

### Implementation for User Story 8

- [x] T074 [US8] Implement `getAnalyticsSeries` in `src/actions/admin/analytics.ts` + `src/domain/admin/analytics.ts`
- [x] T075 [US8] Implement `GET` export route `src/app/api/admin/exports/analytics/route.ts` (auth + audit `admin.export.analytics`)
- [x] T076 [P] [US8] Build Analytics dashboard + appointment/revenue/AI subviews in `src/components/admin/analytics/`
- [x] T077 [US8] Wire `src/app/[locale]/admin/analytics/page.tsx` and `analytics/{appointments,revenue,ai}/page.tsx`

**Checkpoint**: Analytics dashboard + exports operational

---

## Phase 11: User Story 9 Ã¢â‚¬â€ Platform Settings (Priority: P2)

**Goal**: Maintenance mode, support contacts, AI/feature toggles; audited before/after; validation.

**Independent Test**: Maintenance ON blocks non-admin; admin retains access; invalid save blocked.

### Tests for User Story 9

- [x] T078 [P] [US9] Unit test settings validation in `tests/unit/admin/settings.test.ts`
- [x] T079 [P] [US9] Integration test maintenance gate for patient route in `tests/integration/admin/maintenance.test.ts`

### Implementation for User Story 9

- [x] T080 [US9] Implement get/update platform settings in `src/actions/admin/settings.ts` + `src/domain/admin/settings.ts` with audit before/after
- [x] T081 [P] [US9] Build Settings form per Stitch in `src/components/admin/settings/settings-form.tsx`
- [x] T082 [US9] Wire `src/app/[locale]/admin/settings/page.tsx`; ensure T021 maintenance helper consumed by patient/doctor layouts

**Checkpoint**: Runtime platform configuration works

---

## Phase 12: User Story 10 Ã¢â‚¬â€ System Health (Priority: P2)

**Goal**: Healthy/Degraded/Down + component checks; aligns with dashboard Platform Status; health notifications on transition.

**Independent Test**: DB healthy Ã¢â€ â€™ HEALTHY; simulated fail Ã¢â€ â€™ Degraded/Down; dashboard status matches.

### Tests for User Story 10

- [x] T083 [P] [US10] Unit test overall status derivation in `tests/unit/admin/health.test.ts`
- [x] T084 [P] [US10] Integration test snapshot persistence in `tests/integration/admin/health.test.ts`

### Implementation for User Story 10

- [x] T085 [US10] Implement `runHealthChecks` / `getSystemHealth` / `refreshSystemHealth` in `src/domain/admin/health.ts` + `src/actions/admin/health.ts`
- [x] T086 [P] [US10] Optional `GET /api/admin/health/route.ts` for widget refresh
- [x] T087 [P] [US10] Build Health panel UI in `src/components/admin/health/`; share status pill with dashboard widget
- [x] T088 [US10] Wire `src/app/[locale]/admin/health/page.tsx` (combine visually with audit per Stitch if needed)

**Checkpoint**: Platform monitoring visible to admins

---

## Phase 13: User Story 11 Ã¢â‚¬â€ Audit Logs (Priority: P1)

**Goal**: Searchable immutable audit list; export CSV; no edit/delete; export audited.

**Independent Test**: Suspend user Ã¢â€ â€™ find audit row; export filtered set Ã¢â€ â€™ `admin.export.audit` event; no mutate UI.

### Tests for User Story 11

- [x] T089 [P] [US11] Unit test audit query filters in `tests/unit/admin/audit-query.test.ts`
- [x] T090 [P] [US11] Integration test export creates audit event in `tests/integration/admin/audit-export.test.ts`

### Implementation for User Story 11

- [x] T091 [US11] Implement `listAuditEvents` in `src/actions/admin/audit.ts` (SELECT only)
- [x] T092 [US11] Implement `GET src/app/api/admin/exports/audit/route.ts` (Ã¢â€°Â¤10k rows; audit export)
- [x] T093 [P] [US11] Build `AuditTable` + filters + ExportButton in `src/components/admin/audit/`
- [x] T094 [US11] Wire `src/app/[locale]/admin/audit/page.tsx` (tab alongside health to match Stitch combined surface)

**Checkpoint**: Audit logging implemented and operable

---

## Phase 14: User Story 12 Ã¢â‚¬â€ Admin Notifications (Priority: P3)

**Goal**: In-portal admin notifications (approvals, billing, health, AI, security); mark read; All Caught Up empty; optional announcements if Stitch supports.

**Independent Test**: Pending-approval notification appears; mark read; empty Ã¢â€ â€™ All Caught Up; announcement only if design present.

### Tests for User Story 12

- [x] T095 [P] [US12] Unit test notification category mapping in `tests/unit/admin/notifications.test.ts`
- [x] T096 [P] [US12] Integration test markAllRead in `tests/integration/admin/notifications.test.ts`

### Implementation for User Story 12

- [x] T097 [US12] Implement list/markRead/markAllRead (+ optional publishAnnouncement) in `src/actions/admin/notifications.ts` and `announcements.ts`
- [x] T098 [US12] Emit admin notifications from doctor-approve queue, refund, health transition, AI flag paths (hook from existing actions)
- [x] T099 [P] [US12] Build Notification Center UI (center/details/empty/preferences) in `src/components/admin/notifications/`
- [x] T100 [US12] Wire `src/app/[locale]/admin/notifications/page.tsx`; badge poll in `AdminHeader`

**Checkpoint**: Notification management operational

---

## Phase 15: User Story 13 Ã¢â‚¬â€ Role & Permission Management (Priority: P2)

**Goal**: View role matrix; assign/revoke primary roles; invite admin; last-admin guard; IdP cannot elevate.

**Independent Test**: Promote user to ADMIN; demote last admin blocked; non-admin still denied portal.

### Tests for User Story 13

- [x] T101 [P] [US13] Unit test LAST_ADMIN on role revoke in `tests/unit/admin/roles.test.ts`
- [x] T102 [P] [US13] Integration test assignUserRole audits in `tests/integration/admin/roles.test.ts`

### Implementation for User Story 13

- [x] T103 [US13] Implement listRolesMatrix / assignUserRole / inviteAdmin in `src/actions/admin/roles.ts` (reuse Auth invite)
- [x] T104 [P] [US13] Build Roles UI adapting User Management / Settings chrome (no new visual language) in `src/components/admin/roles/`
- [x] T105 [US13] Wire `src/app/[locale]/admin/roles/page.tsx`

**Checkpoint**: RBAC management UI complete (enforcement already foundational)

---

## Phase 16: Polish & Cross-Cutting (DoD)

**Purpose**: Accessibility, performance, i18n completeness, quickstart validation, production readiness

- [x] T106 [P] Accessibility tests for dashboard, user suspend, doctor approve keyboard flows in `tests/a11y/admin/`
- [x] T107 [P] Performance tests for list pagination (page size 20) and dashboard widget budget in `tests/perf/admin/`
- [x] T108 [P] E2E happy-path suite covering DoD scenarios from [quickstart.md](./quickstart.md) in `tests/e2e/admin/quickstart.spec.ts`
- [x] T109 Complete EN/AR strings for all admin surfaces in `src/i18n/messages/{en,ar}.json`
- [x] T110 Pixel QA pass: shell + dashboard + Ã¢â€°Â¥3 management pages vs `specs/005-admin-portal/design/` PNGs; fix spacing/typography only (no IA redesign)
- [x] T111 Security hardening: confirm anti-enumeration on user/doctor ids, no PHI in export filenames/URLs, CSRF on export routes
- [x] T112 Run full [quickstart.md](./quickstart.md) validation; record results in `specs/005-admin-portal/quickstart-results.md`
- [x] T113 [P] Definition of Done checklist in `specs/005-admin-portal/checklists/dod.md` (platform manageability, RBAC, billing/analytics, AI ops, audit, production-ready)
- [x] T114 Remove interim Auth admin panels / marketing-margin leftovers from `src/app/[locale]/admin/` and unused `src/components/auth/admin-panels.tsx` usages once replaced

**Checkpoint**: Production-ready Administration Portal

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup Ã¢â‚¬â€ **BLOCKS** all user stories
- **US1 (Entry/Shell)**: After Foundational
- **US2 (Dashboard)**: After US1 shell placeholder (or Foundational if shell done) Ã¢â‚¬â€ **MVP**
- **US3Ã¢â‚¬â€œUS4 (Users/Doctors)**: After Foundational; benefit from US2 quick actions links
- **US5Ã¢â‚¬â€œUS10, US13**: After Foundational; can parallelize once MVP done
- **US11 (Audit)**: After Foundational (writes already exist); best after US3/US4 generate events
- **US12 (Notifications)**: After hooks exist in US4/US7/US10/US6
- **Polish**: After desired stories complete

### User Story Dependencies

| Story | Depends on | Notes |
|-------|------------|-------|
| US1 Entry/Shell | Phase 2 | |
| US2 Dashboard | US1 / Phase 2 shell | MVP |
| US3 Users | Phase 2 | |
| US4 Doctors | Phase 2 (+ Auth admin migrate T015) | |
| US5 Appointments | Phase 2 | |
| US6 AI Ops | Phase 2 (+ settings model) | Gates touch patient/doctor AI |
| US7 Billing | Phase 2 (PaymentObligation fields) | |
| US8 Analytics | Phase 2; richer after US5/US7 data | |
| US9 Settings | Phase 2 | Feeds maintenance T021 |
| US10 Health | Phase 2 | Feeds dashboard status |
| US11 Audit | Phase 2 | |
| US12 Notifications | Emitters in US4/US6/US7/US10 | |
| US13 Roles | Phase 2 (+ T015) | |

### Parallel Opportunities

- Phase 1: T002Ã¢â‚¬â€œT006 in parallel after T001/T003 structure
- Phase 2: T012Ã¢â‚¬â€œT017, T019Ã¢â‚¬â€œT022 in parallel after schema migration T007Ã¢â‚¬â€œT011
- After Phase 2: US3/US4/US5/US7/US9/US11 can proceed in parallel by different owners
- US6 AI gates (T062) coordinate with patient/doctor modules
- All `[P]` tests within a story can run together

### Parallel Example: User Story 2 (Dashboard)

```bash
# Tests in parallel:
Task: tests/unit/admin/dashboard.test.ts
Task: tests/integration/admin/dashboard.test.ts
Task: tests/perf/admin/dashboard-caps.perf.test.ts

# Widgets in parallel after getDashboardSnapshot:
Task: stats-widgets.tsx
Task: revenue-widget.tsx + ai-metrics-widget.tsx
Task: platform-status + pending-approvals
Task: recent-activities + notifications + quick-actions
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1 Setup  
2. Complete Phase 2 Foundational (CRITICAL)  
3. Complete US1 Secure Entry & Shell  
4. Complete US2 Admin Dashboard  
5. **STOP and VALIDATE** dashboard + access control  
6. Demo MVP

### Incremental Delivery (recommended)

1. MVP (US1Ã¢â‚¬â€œUS2)  
2. Users + Doctors + Audit (US3, US4, US11) Ã¢â‚¬â€ core ops + compliance  
3. Billing + Settings + Health (US7, US9, US10)  
4. Appointments + AI + Analytics (US5, US6, US8)  
5. Notifications + Roles (US12, US13)  
6. Polish / DoD / quickstart  

### Suggested MVP Scope

**US1 + US2 only**: Secure admin shell + dashboard KPIs/quick actions. Enough to prove ADMIN RBAC and operational home before lifecycle/billing depth.

---

## Notes

- [P] = different files, no incomplete deps  
- Do **not** redesign UI; Stitch SoT (`2408493713147971043`)  
- Pixel tasks after T019 design export  
- Commit after each task or logical group  
- Stop at checkpoints to validate independently  
- Avoid clinical chart editors in admin (FR-028)  

---

## Phase 17: Convergence

**Purpose**: Close gaps between spec/plan/tasks and current Administration Portal implementation (post /speckit-implement).

### CRITICAL

- [x] T115 CRITICAL: On doctor approve, provision or link CMS `Doctor` profile, set bookable/discovery eligibility, and avoid orphan approvals in `src/actions/auth/admin.ts` / `src/actions/admin/doctors.ts` per FR-011 (missing)
- [x] T116 CRITICAL: Wire `assertCanApprove` / `assertCanReject` into approve/reject flows so already-decided applications are idempotent without duplicate invites/audits in `src/actions/auth/admin.ts` per FR-031 (contradicts)
- [x] T117 CRITICAL: Enforce AI fail-closed (global toggles + per-user disable) on `src/app/api/patient/ai/chat/route.ts` (and any other AI route handlers) per FR-037 (partial)
- [x] T118 CRITICAL: Add CSRF / same-origin protection to `src/app/api/admin/exports/audit/route.ts` and `src/app/api/admin/exports/analytics/route.ts` per plan:CSRF / T111 (missing)
- [x] T119 CRITICAL: Add Playwright admin auth fixture and unskip `tests/e2e/admin/access.spec.ts` + `tests/e2e/admin/quickstart.spec.ts` DoD flows per T108 / US1 (missing)

### HIGH

- [x] T120 [P] Export remaining approved Stitch admin screens into `specs/005-admin-portal/design/` and update `manifest.json` for pixel QA per FR-003 / SC-009 (partial)
- [x] T121 Ensure non-admin and unauthenticated admin-route denials are audited as `admin.access.denied` (or equivalent admin denial) in `src/auth/role-layout.ts` / guards per FR-002 (partial)
- [x] T122 On doctor suspend, flag future CONFIRMED appointments for ops review and notify affected parties in `src/actions/admin/doctors.ts` per US4 edge case (missing)
- [x] T123 Notify payer/patient when a refund completes (not only admins) in `src/actions/admin/billing.ts` per FR-015 / US7/AC2 (partial)
- [x] T124 Notify patient and doctor when an admin cancels an appointment in `src/actions/admin/appointments.ts` per FR-012 / US5/AC2 (partial)
- [x] T125 Make audit CSV export honor the same actor/action/date filters as the audit list UI in `src/app/api/admin/exports/audit/route.ts` per FR-020 / US11/AC3 (partial)
- [x] T126 Add role assign/revoke and admin invite UI with confirmation on `src/app/[locale]/admin/roles/page.tsx` using `src/actions/admin/roles.ts` per FR-022 / US13 (partial)
- [x] T127 Emit pending-doctor-approval admin notifications when `createDoctorUser` creates PENDING_APPROVAL in `src/actions/auth/admin.ts` / `src/lib/admin/notify-admins.ts` per US12 / T098 (partial)
- [x] T128 Remove unused `src/components/auth/admin-panels.tsx` and finish migrating any remaining auth-admin UI usage into admin module per T114 (partial)
- [x] T129 Replace stub integration tests with DB-backed coverage for user suspend, doctor approve/reject, refund, and access denial under `tests/integration/admin/` per T042/T048/T066 (contradicts)

### MEDIUM

- [x] T130 [P] Add role/status filter controls on `src/app/[locale]/admin/users/page.tsx` wired to `listUsers` per FR-009 / US3/AC1 (partial)
- [x] T131 [P] Add appointment date/status(/doctor) filters on `src/app/[locale]/admin/appointments/page.tsx` and extend `listAppointments` per FR-012 / US5/AC1 (partial)
- [x] T132 Add revenue period selector (Today/7d/30d/custom) on `src/app/[locale]/admin/revenue/page.tsx` per FR-015 (partial)
- [x] T133 [P] Add audit log filter UI (actor, action type, date range) on `src/app/[locale]/admin/audit/page.tsx` per FR-020 / US11/AC1 (partial)
- [x] T134 Render notification deep links from `href` in `src/components/admin/notifications/notification-list.tsx` per FR-021 / US12/AC1 (partial)
- [x] T135 Add flagged-AI review and per-user AI disable UI on `src/app/[locale]/admin/ai/page.tsx` per FR-013 (partial)
- [x] T136 Require admin-entered reject reason via `ConfirmReasonDialog` in `src/components/admin/doctors/doctor-queue-actions.tsx` per FR-036 (partial)
- [x] T137 [P] Add `loading.tsx` / ListSkeleton usage for primary admin list and dashboard routes under `src/app/[locale]/admin/` per FR-038 (partial)
- [x] T138 Implement real health checks for configured payments/AI/telemedicine (not always-OK stubs) in `src/actions/admin/health.ts` per FR-019 (partial)
- [x] T139 Replace placeholder a11y contract with real keyboard/axe checks for dashboard, suspend, and approve flows in `tests/a11y/admin/` per FR-006 / SC-008 (partial)

**Checkpoint**: After /speckit-implement on Phase 17, re-run /speckit-converge to confirm closure.
