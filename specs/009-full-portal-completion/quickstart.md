# Quickstart: Full Portal Completion

**Feature**: `009-full-portal-completion` | **Date**: 2026-08-13

Validate the care loop after implementation. Details: [data-model.md](./data-model.md), [contracts/care-loop-api.md](./contracts/care-loop-api.md), [contracts/ui.md](./contracts/ui.md).

## Prerequisites

```bash
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

Accounts:

| Role | Email | Password |
|------|--------|----------|
| Patient | patient@hakeem.local | Patient!Pass1234 |
| Doctor | doctor@hakeem.local | Doctor!Pass1234 |
| Admin | admin@hakeem.local | Admin!Pass1234 |

Open [http://localhost:3000/en/login](http://localhost:3000/en/login).

Seeded demo doctor MUST have weekly hours (Sun–Thu 09:00–17:00 or equivalent). LiveKit optional; demo video is valid this wave.

## 1. Doctor publishes hours (US1 / FR-015)

1. Sign in as doctor → `/en/doctor/schedule`.
2. Set or edit weekly hours; save; reload persists.
3. Clear all hours; save.
4. In another browser as patient, open that doctor’s portal profile — booking shows unavailable (no 09:00–17:00 stub).
5. Restore hours; patient sees 30-minute slots within 14 days only.

## 2. Patient books a true slot (US1 / FR-001–003)

1. Patient: Find doctor → pick VIDEO 30-minute slot → hold → confirm.
2. Appointment appears in patient Upcoming.
3. Doctor: notification “new booking” + appointment on Today/Upcoming.
4. Second patient cannot take the same start time (`SLOT_UNAVAILABLE`).
5. Slot more than 14 days ahead is not listed.

## 3. Check-in stays visible (US2 / FR-004)

1. Doctor check-in.
2. Patient Upcoming still shows the visit (CHECKED_IN), not only History.
3. Doctor queue lists the patient.

## 4. Consult, document, patient records (US2 / FR-005–006)

1. Inside join window, both Join video.
2. If LiveKit is unset: labeled **Demo video**, no Admit, no working in-call chat.
3. If LiveKit is set: live conference for that appointment only.
4. Doctor start → SOAP/summary/Rx sign → complete.
5. Patient opens Records and Prescriptions within a minute; drafts stay hidden.

## 5. Honesty and public CTAs (US3–US4)

1. Confirm does not require Pay now.
2. Payments page does not look like a real card charge.
3. Public Book/Login/Register stay in-app; Book with slug reaches patient doctor page after login.
4. Patient cannot open `/en/doctor`; doctor cannot open `/en/patient` (access denied).

## Expected outcomes

- Zero unlabeled stub slot grids in production-like seed.
- Zero silent no-ops on Join, Admit, Chat, Pay on the happy path (hidden, labeled, or working).
- Care loop completable on localhost without LiveKit.
