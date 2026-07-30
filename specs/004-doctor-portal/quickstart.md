# Quickstart: Doctor Portal validation

**Feature**: `004-doctor-portal` | **Date**: 2026-07-30

Runnable checks to prove the doctor portal end-to-end after implementation. Details: [doctor-api.md](./contracts/doctor-api.md), [data-model.md](./data-model.md).

## Prerequisites

- Neon/Postgres running; `DATABASE_URL` set
- Migrations applied (Module 1–2 + doctor portal migration)
- Seeded users:
  - Doctor: linked `User.doctorProfileId` → CMS `Doctor` (e.g. `doctor@hakeem.local`)
  - Patient with appointments assigned to that doctor
- Dev server: `npm run dev` (port per env, often 3001)
- Stitch design pack in `design/` for visual QA (optional for API/domain checks)

## Setup

```bash
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Sign in as Doctor → land on `/{locale}/doctor`.

## Validation scenarios

### 1. Access control
1. Open `/en/doctor` as Patient or Admin → denied (unauthorized/access-denied), no clinical payload.
2. Doctor without `doctorProfileId` → clear unlink error, no schedule data.

### 2. Dashboard
1. Widgets load independently; force one loader failure → others still render.
2. Caps: today ≤8, upcoming ≤5, pending notes ≤5, recent patients ≤5, notifs ≤5.
3. Quick actions navigate or prompt for patient/appointment context.

### 3. Schedule / queue / single in-progress
1. Today’s schedule shows assigned visits.
2. Check-in (or seed CHECKED_IN) → appears on queue ordered by check-in.
3. Start consultation → workspace; second start while In progress → `ALREADY_IN_PROGRESS`.
4. Mark no-show on waiting visit → leaves queue; audited.

### 4. Consultation + SOAP + signature
1. Save SOAP draft; refresh → draft restored.
2. Finalize with empty Assessment → blocked.
3. Finalize with Assessment+Plan → FINAL; pending count drops.
4. Amend with reason → new version; original immutable.
5. Complete visit without finalize → Completed + pending notes remain.

### 5. Prescription Review & Sign
1. Create draft with lines → not visible on patient prescriptions list.
2. Hard allergy match → sign blocked.
3. Sign success → ACTIVE; visible to patient portal rules; audit has signer.

### 6. AI assistants
1. Generate documentation suggestion → Accept into SOAP draft only (not FINAL).
2. Exceed 30 generations/hour → `RATE_LIMITED`; manual path works.
3. AI cannot call finalize/sign endpoints successfully.

### 7. Labs / records
1. Doctor sees Preliminary + Final for care-relationship patient.
2. Patient still sees Released only.
3. Mark reviewed stores acknowledgement; view audited.
4. Foreign patient id → NOT_FOUND.

### 8. Video
1. Inside join window → doctor host session loads.
2. Outside window → `JOIN_WINDOW_CLOSED`.
3. Media failure → recovery copy; documentation still available.

### 9. Notifications / i18n
1. Check-in / pending-notes aging triggers in-portal notification.
2. Deep link re-checks authz.
3. Switch AR → RTL chrome; critical actions labeled.

### 10. Offline / conflict
1. Toggle offline → Sign/Complete disabled or fails closed (no false success).
2. Two tabs save draft → second gets CONFLICT and reload.

## Automated tests (when present)

```bash
npx vitest run tests/unit/doctor
npx playwright test e2e/doctor
```

## Expected outcomes

- All scenarios above pass without PHI leakage or cross-doctor access.
- Visual QA checklist in [ui-review.md](./ui-review.md) signed when Stitch assets available.
