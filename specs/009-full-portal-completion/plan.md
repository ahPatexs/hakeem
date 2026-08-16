# Implementation Plan: Full Portal Completion

**Branch**: `009-full-portal-completion` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-full-portal-completion/spec.md`

## Summary

Close the care loop across public, auth, patient, doctor, admin, video, and EMR without rebuilding modules 001-008. Replace stub availability with doctor-owned weekly hours (30-minute slots, 14-day horizon), notify the doctor on confirm, keep CHECKED_IN visits on patient Upcoming, label demo video when LiveKit is off, and remove silent no-ops (admit, in-call chat, stub pay). Public Book/Login/Register stay in-app.

Stack: existing Next.js 15 App Router, Prisma/Neon, Server Actions + Zod, next-intl, platform `notify()` and telemedicine adapters.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), Node.js 20 LTS

**Primary Dependencies**: Next.js 15 App Router, Prisma 6, Zod, Tailwind, next-intl, existing `@/auth`, `@/lib/platform/notifications`, telemedicine adapters

**Storage**: Neon PostgreSQL via Prisma; new `DoctorWeeklyHours` and `DoctorUnavailableDay`

**Testing**: Vitest (slot generation, overlap, hours validation, upcoming statuses); Playwright care-loop smoke (book, notify, check-in visible, demo video label)

**Target Platform**: Vercel + Neon; localhost demo without LiveKit is in scope

**Project Type**: Web application (extend single Next.js app)

**Performance Goals**: Availability for one doctor for 14 days generated in-request (p95 well under 500ms for typical hours); confirm + notify without blocking the patient redirect

**Constraints**: EN/AR + RTL; no silent no-ops; no pay-to-confirm; no new messaging/AI/payments product; HIPAA-ready (authz, audit, no PHI in URLs); Stitch tokens reuse -- no redesign

**Scale/Scope**: One new doctor hours surface; booking/availability/upcoming/video/payments/public CTA patches; seed hours for demo doctor

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template -- **PASS by default**. Discipline: single-app extension; reuse appointments, notifications, video ports; Server Actions + Zod; no new microservice.

**Post-Phase 1 re-check**: Two new tables for hours/exceptions are required by FR-001/FR-015. Derived slots (not persisted) keep complexity down. **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/009-full-portal-completion/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── care-loop-api.md
│   └── ui.md
└── tasks.md              # /speckit-tasks -- not created by this command
```

### Source Code (repository root)

```text
prisma/schema.prisma                      # DoctorWeeklyHours, DoctorUnavailableDay
src/domain/doctor/hours.ts                # validation
src/lib/doctor/hours.ts                   # CRUD
src/lib/patient/availability.ts           # replace availability-stub.ts
src/actions/doctor/hours.ts
src/actions/patient/appointments.ts       # notify doctor; availability gate
src/actions/patient/doctors.ts            # real slots
src/lib/doctor/notification-triggers.ts   # notifyDoctorAppointmentConfirmed
src/components/doctor/schedule/hours-form.tsx
src/components/patient/doctors/doctor-profile.tsx
src/components/platform/video/session-shell.tsx
src/lib/cta.ts
src/i18n/messages/{en,ar}.json
prisma/seed.ts
tests/unit/availability/
tests/e2e/care-loop/
```

**Structure Decision**: Extend the existing Next.js app. No new package or service.

## Complexity Tracking

No constitution violations.

## Implementation notes (for /speckit-tasks)

1. Prisma models + migrate + seed Sun-Thu 09:00-17:00 for demo doctor.
2. Doctor hours actions + schedule UI.
3. Replace `generateStubAvailability` with derived 30-min / 14-day offers; empty if no hours.
4. Hold/confirm/reschedule must use the same generator; transactional overlap check.
5. `confirmAppointment` notifies doctor via `notify()`.
6. Patient upcoming + dashboard include CHECKED_IN.
7. Video demo banner; hide admit + stub chat.
8. Payments honesty; public CTA next=patient doctor page.
9. i18n EN/AR for new copy.
10. Unit tests for generator; Playwright loop in quickstart.md.