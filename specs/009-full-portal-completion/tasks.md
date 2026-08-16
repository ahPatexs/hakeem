# Tasks: Full Portal Completion

**Input**: Design documents from `/specs/009-full-portal-completion/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Unit tests for slot generation (plan Technical Context). Playwright care-loop smoke in Polish. No full TDD suite unless added later.

**Organization**: Setup → Foundational (schema + slot engine) → US1–US4 by spec priority → Polish (quickstart)

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable (different files, no incomplete deps)
- **[Story]**: [US1]…[US4] for story phases only

## Path Conventions

Single Next.js app: `src/`, `prisma/`, `tests/` at repository root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Folders, i18n keys, error codes for the care loop

- [x] T001 Create `src/domain/doctor/hours.ts`, `src/lib/doctor/hours.ts`, `src/actions/doctor/hours.ts`, `src/lib/patient/availability.ts`, `src/components/doctor/schedule/hours-form.tsx`, `tests/unit/availability/`, `tests/e2e/care-loop/`
- [x] T002 [P] Add care-loop copy keys (hours, no slots, demo video, demo pay) to `src/i18n/messages/en.json`
- [x] T003 [P] Add matching Arabic keys to `src/i18n/messages/ar.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schedule tables, domain validation, derived 30-minute / 14-day slot engine. MUST complete before user stories.

**CRITICAL**: No user story work until this phase is complete

- [x] T004 Add Prisma models `DoctorWeeklyHours` and `DoctorUnavailableDay` on `Doctor` in `prisma/schema.prisma` per [data-model.md](./data-model.md)
- [x] T005 Create and apply Prisma migration under `prisma/migrations/` for the new schedule tables
- [x] T006 Seed weekly hours for `doctor@hakeem.local` (Sun–Thu 09:00–17:00 Asia/Riyadh) in `prisma/seed.ts`
- [x] T007 Implement weekday/window validation (`endMinutes > startMinutes`, multiple of 30, weekday 0–6) in `src/domain/doctor/hours.ts`
- [x] T008 Implement derived availability (30-minute slots, 14-day horizon, skip unavailable days, skip past starts, skip overlapping HELD-unexpired/CONFIRMED/CHECKED_IN/IN_PROGRESS) in `src/lib/patient/availability.ts`
- [x] T009 Stop exporting invented stub grids from `src/lib/patient/availability-stub.ts` (delete or re-export the real generator only)
- [x] T010 Add error codes `SCHEDULE_MISSING`, `SLOT_OUTSIDE_HOURS`, `SLOT_HORIZON`, `HOURS_OVERLAP` to patient/doctor action result handling in `src/actions/patient/doctors.ts` and `src/actions/doctor/hours.ts`
- [x] T011 [P] Unit tests for slot generation, overlap, empty hours, and 14-day cutoff in `tests/unit/availability/availability.test.ts`

**Checkpoint**: Foundation ready — hours persist and slots can be generated with no UI yet

---

## Phase 3: User Story 1 - Patient books a true available slot (Priority: P1) MVP

**Goal**: Doctor publishes weekly hours; patient sees only real 30-minute slots for 14 days; hold/confirm; no double-book; no hours means unavailable.

**Independent Test**: Doctor sets hours → patient books a listed slot → second book of same start fails → doctor schedule shows the visit. Clear hours → patient sees no invented 09:00–17:00 grid.

### Implementation for User Story 1

- [x] T012 [US1] Implement `getDoctorHours`, `saveDoctorHours`, `addDoctorUnavailableDay`, `removeDoctorUnavailableDay` in `src/actions/doctor/hours.ts` and persistence in `src/lib/doctor/hours.ts`
- [x] T013 [US1] Build weekly hours editor UI in `src/components/doctor/schedule/hours-form.tsx`
- [x] T014 [US1] Mount hours editor on `src/app/[locale]/doctor/schedule/page.tsx`
- [x] T015 [US1] Replace stub `generateStubAvailability` usage with `getDoctorAvailability` in `src/actions/patient/doctors.ts`
- [x] T016 [US1] Wire real slots and empty/NO_HOURS state in `src/components/patient/doctors/doctor-profile.tsx`
- [x] T017 [US1] Gate `holdAppointmentSlot` and `rescheduleAppointment` on the same generator (reject `SLOT_OUTSIDE_HOURS` / `SLOT_HORIZON` / `SLOT_UNAVAILABLE`) in `src/actions/patient/appointments.ts`
- [x] T018 [US1] Remove stub availability note copy from patient booking UI strings in `src/i18n/messages/en.json` and `src/i18n/messages/ar.json` (patient.doctors.availabilityStubNote)

**Checkpoint**: US1 independently testable via quickstart scenarios 1–2

---

## Phase 4: User Story 2 - Complete consultation and records follow (Priority: P1)

**Goal**: After check-in the patient still sees the visit; Join video is live or a labeled demo room; signed summary/Rx remain patient-visible (already EMR — do not regress).

**Independent Test**: Check-in → patient Upcoming still lists the visit → both join video (demo banner if no LiveKit) → doctor signs summary/Rx → patient opens Records/Prescriptions.

### Implementation for User Story 2

- [x] T019 [US2] Include `CHECKED_IN` in `listUpcoming` in `src/actions/patient/appointments.ts`
- [x] T020 [P] [US2] Include `CHECKED_IN` in dashboard upcoming query in `src/lib/patient/dashboard.ts`
- [x] T021 [US2] Add labeled demo-video banner and hide Admit plus in-call chat when stub URL in `src/components/platform/video/session-shell.tsx`
- [x] T022 [P] [US2] Hide or disable no-op admit control in `src/components/platform/video/waiting-room.tsx` (and `src/actions/doctor/video.ts` if the button still calls it)
- [x] T023 [P] [US2] Add demo-video i18n strings used by the shell in `src/i18n/messages/en.json` and `src/i18n/messages/ar.json`

**Checkpoint**: US2 independently testable via quickstart scenarios 3–4

---

## Phase 5: User Story 3 - Notifications honest and dead controls gone (Priority: P1)

**Goal**: Doctor is notified on confirm; stub Pay now is not a real charge; remaining care-loop controls are working or honestly disabled.

**Independent Test**: Confirm a booking → doctor in-app notification with appointment deep link; Payments page has no unlabeled live charge; Admit/chat already honest from US2.

### Implementation for User Story 3

- [x] T024 [US3] Add `notifyDoctorAppointmentConfirmed` in `src/lib/doctor/notification-triggers.ts`
- [x] T025 [US3] Call doctor notify from `confirmAppointment` in `src/actions/patient/appointments.ts` (resolve doctor user via `User.doctorProfileId`)
- [x] T026 [US3] Remove or demo-label stub Pay now in `src/app/[locale]/patient/payments/` and `src/actions/patient/payments.ts` so confirm never requires payment
- [x] T027 [P] [US3] Update payment copy in `src/i18n/messages/en.json` and `src/i18n/messages/ar.json` (patient.payments.stubPayNote / payNow)

**Checkpoint**: US3 independently testable via quickstart scenario 5 (notify + pay honesty)

---

## Phase 6: User Story 4 - Public, auth, and admin support the same loop (Priority: P2)

**Goal**: Public Login/Register/Book enter in-app auth or patient doctor booking; approved doctors become bookable only after they publish hours; wrong-role URLs stay denied.

**Independent Test**: Logged-out Book on a doctor slug → login with next to `/patient/doctors/{slug}`; after login the portal book grid shows. Admin approve still required before doctor login. Patient cannot open `/doctor`.

### Implementation for User Story 4

- [x] T028 [US4] Change `buildAppCtaUrl("book")` so unauthenticated users go to login with `next` to `/{locale}/patient/doctors/{slug}` (or register without slug) in `src/lib/cta.ts`
- [x] T029 [P] [US4] Confirm public navbar/footer Book/Login/Register still use in-app routes in `src/components/layout/navbar.tsx` and `src/components/layout/footer.tsx`
- [x] T030 [US4] Ensure login honors safe `next` to patient doctor profile in `src/components/auth/login-form.tsx` and `src/actions/auth/login.ts`
- [x] T031 [P] [US4] Keep doctor bookable search requiring PUBLISHED + hours in `src/actions/patient/doctors.ts` (unpublished/unapproved never offered)

**Checkpoint**: US4 independently testable via quickstart scenario 5 public CTAs

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Care-loop smoke, leftover stub copy, seed/docs

- [x] T032 [P] Add Playwright smoke for hours → book → upcoming in `tests/e2e/care-loop/book.spec.ts`
- [x] T033 [P] Add Playwright smoke for CHECKED_IN still listed and demo video copy in `tests/e2e/care-loop/consult.spec.ts`
- [x] T034 Remove leftover stub availability imports from `src/components/patient/appointments/` if reschedule still uses the stub
- [x] T035 Run [quickstart.md](./quickstart.md) validation on localhost:3000 with seeded accounts
- [x] T036 [P] Confirm EN/AR strings for hours, empty slots, demo video, demo pay exist in `src/i18n/messages/en.json` and `src/i18n/messages/ar.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — MVP
- **US2 (Phase 4)**: Depends on Foundational; better after US1 so a real booked visit exists
- **US3 (Phase 5)**: Depends on US1 confirm path
- **US4 (Phase 6)**: Depends on US1 booking URL; can start after Foundational for CTA-only work
- **Polish (Phase 7)**: After stories to validate

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no other stories
- **US2 (P1)**: After Phase 2; uses existing appointments if seeded CHECKED_IN exists
- **US3 (P1)**: After US1 confirm exists
- **US4 (P2)**: After US1 patient doctor page uses real slots

### Parallel Opportunities

- T002 / T003 (i18n)
- T019 / T020 (CHECKED_IN lists)
- T021 vs T022 vs T023 (video honesty files)
- T028 / T029 / T031 (public CTAs vs search)
- T032 / T033 (Playwright specs)

### Parallel Example: User Story 2

```text
T019 listUpcoming CHECKED_IN in src/actions/patient/appointments.ts
T020 dashboard CHECKED_IN in src/lib/patient/dashboard.ts
T023 demo-video i18n in src/i18n/messages/en.json and ar.json
```

Then T021 session-shell (uses T023 strings).

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup
2. Phase 2 Foundational
3. Phase 3 US1
4. STOP and validate: doctor hours + patient real slots + no double-book

### Incremental Delivery

1. US1 → real marketplace
2. US2 → visible check-in + honest video
3. US3 → doctor notify + pay honesty
4. US4 → public CTAs into the loop
5. Polish → quickstart.md

---

## Notes

- [P] = different files, no incomplete deps
- Do not reintroduce `generateStubAvailability` 09:00–17:00 grids
- Existing EMR sign/read paths are in scope only to avoid regression (US2)
- Commit after each task or logical group

---

## Phase 8: Convergence

**Purpose**: Close remaining gaps found after `/speckit-implement` against spec.md, plan.md, and contracts.

- [x] T037 Keep CHECKED_IN and IN_PROGRESS visits visible on patient Upcoming regardless of startAt in `src/actions/patient/appointments.ts` `listUpcoming` and `src/lib/patient/dashboard.ts` `loadUpcoming` per FR-004 / US2/AC1 / SC-003 (partial)
- [x] T038 Perform the hold overlap query and appointment create inside one Prisma transaction in `src/actions/patient/appointments.ts` `holdAppointmentSlot`, returning `SLOT_UNAVAILABLE` on conflict per FR-002 / plan: overlap in a transaction (partial)
