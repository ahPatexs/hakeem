# Research: Full Portal Completion

**Feature**: `009-full-portal-completion` | **Date**: 2026-08-13

All clarify questions were answered in spec.md. This file records implementation decisions so Phase 1 has no open `NEEDS CLARIFICATION`.

## 1. Doctor-owned weekly hours

**Decision**: Persist weekly hours as `DoctorWeeklyHours` (one row per weekday per doctor) plus `DoctorUnavailableDay` (full-day exceptions). Generate 30-minute offers in application code for the next 14 days. Do not persist every slot as a row.

**Rationale**: Hours change rarely; slots are derived. Persisting thousands of slot rows would duplicate `Appointment` conflict data. Existing `Appointment` already holds occupancy.

**Alternatives considered**:
- Persist every 30-minute `ScheduleSlot` — rejected (write amplification, stale rows).
- Admin-owned hours — rejected by clarify Q2.
- Keep stub 09:00–17:00 grid — rejected by FR-001.

## 2. Slot generation and conflict

**Decision**: Offer a slot when it is inside published hours, not on an unavailable day, start is in the future, start is within 14 calendar days, duration is 30 minutes, and no overlapping appointment exists with status `HELD` (unexpired), `CONFIRMED`, `CHECKED_IN`, or `IN_PROGRESS`. Timezone = doctor `DoctorProfileExtras.timezone` or `Asia/Riyadh`.

**Rationale**: Matches FR-001/FR-002. Expired holds do not block. Cancelled/completed/no-show/rescheduled do not block.

**Alternatives considered**:
- Unique DB constraint on `(doctorId, startAt)` only — insufficient because overlap is interval-based.
- Advisory lock per doctor on hold/confirm — optional extra; interval query in a transaction is enough for v1.

## 3. Doctor notification on confirm

**Decision**: On `confirmAppointment` success, call existing `notify()` (`src/lib/platform/notifications.ts`) for the linked doctor user (`User.doctorProfileId` = appointment `doctorId`) with category `APPOINTMENT`, href `/doctor/appointments/{id}`. Keep existing patient confirmation notification.

**Rationale**: Triggers already exist for check-in; confirm was the missing call site (FR-003). No new table.

**Alternatives considered**: Email/SMS on book — out of wave (ops adapters remain stub).

## 4. Patient visibility of checked-in visits

**Decision**: Include `CHECKED_IN` (and keep `HELD`, `CONFIRMED`, `IN_PROGRESS`) in patient `listUpcoming` and dashboard upcoming widget. History stays terminal statuses.

**Rationale**: FR-004 / SC-003. Current gap is `listUpcoming` omitting `CHECKED_IN`.

## 5. Honest video

**Decision**: Reuse `VideoSession` + adapters. If `TELEMEDICINE_ADAPTER` is `livekit` (or non-stub) and credentials succeed, show LiveKit conference. Otherwise show the stub session **with explicit “Demo video” copy** (EN/AR). Hide waiting-room Admit and in-call chat in demo mode (FR-011). Do not hide Join video (clarify Q3).

**Rationale**: Same appointment room id keeps both parties aligned. Labeling satisfies honesty without blocking localhost.

**Alternatives considered**: Hide Join until LiveKit — rejected. Unlabeled stub — rejected.

## 6. Payments honesty

**Decision**: Confirm remains free (FR-010). Remove or disable “Pay now” as a real charge. If the payments page stays, label remaining demo obligations as demo and do not require pay to confirm.

**Rationale**: Clarify scoped collectible payments out. Silent stub checkout is a no-op.

## 7. Public CTAs

**Decision**: `buildAppCtaUrl("book")` for a known doctor slug goes to `/{locale}/patient/doctors/{slug}` when the visitor is (or will be) a patient; unauthenticated users go to login with `next` set to that path (or register from marketing Get Started). Login/Register stay in-app.

**Rationale**: FR-008. Today book often lands on public CMS profile, not the portal book engine.

## 8. Hours UI location

**Decision**: Add doctor hours editor on `/[locale]/doctor/schedule` (same area as day calendar) or a sibling “Hours” tab. Reuse portal tokens; no new design system.

**Rationale**: Spec 004 said doctors do not rebook others’ slots; publishing own hours is new and belongs next to the schedule viewer.

## 9. Seed

**Decision**: Seed `doctor@hakeem.local` with Sunday–Thursday 09:00–17:00 Asia/Riyadh (or equivalent clinic week) so demo booking works without manual setup. Clearing hours in UI must still make booking unavailable.

## 10. Stack

**Decision**: Same as modules 001–008: Next.js 15 App Router, TypeScript strict, Prisma/Neon, Server Actions + Zod, next-intl, existing notification/video ports. No new microservice.
