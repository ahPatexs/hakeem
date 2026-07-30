# Quickstart: Administration Portal validation

**Feature**: `005-admin-portal` | **Date**: 2026-07-30

Runnable checks to prove the admin portal end-to-end after implementation. Details: [admin-api.md](./contracts/admin-api.md), [data-model.md](./data-model.md).

## Prerequisites

- Neon/Postgres running; `DATABASE_URL` set
- Migrations applied (Modules 1–3 + admin portal migration)
- Seeded users:
  - Admin: `admin@hakeem.local` (Active `ADMIN`)
  - Patient / Doctor for denial + lifecycle tests
  - Pending doctor applicant (`doctorApproval=PENDING_APPROVAL`)
- Dev server: `npm run dev`
- Stitch design pack in `design/` for visual QA (optional for API/domain checks)

## Setup

```bash
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Sign in as Admin → land on `/{locale}/admin`.

## Validation scenarios

### 1. Access control
1. Open `/en/admin` as Patient or Doctor → denied; audit `admin.access.denied` (or equivalent).
2. Anonymous → login / unauthorized; no admin payload.
3. Idle &gt;15 minutes → session ended; re-auth required.

### 2. Dashboard
1. All KPI widgets render or show empty/error independently.
2. Pending approvals count matches doctor queue.
3. Quick actions navigate to doctors, users, analytics, settings, AI, audit.
4. Force one loader failure → other widgets still render.

### 3. User lifecycle
1. Search user → suspend with reason ≥10 → cannot sign in; sessions revoked; audit row exists.
2. Reinstate → can sign in.
3. Unlock lockout user → clears lock.
4. Suspend self → `SELF_ACTION_BLOCKED`.
5. Demote/suspend last admin → `LAST_ADMIN`.

### 4. Doctor approval
1. Approve pending → Active + invite path; appears bookable per public rules; audit.
2. Reject other with reason → non-bookable; audit.
3. Re-approve already approved → idempotent.
4. Suspend approved doctor → new bookings blocked; sessions revoked.

### 5. Appointments ops
1. Filter by date/status → list page size 20.
2. Cancel with reason → status updated; parties notified; audited.
3. No SOAP editor / clinical sign controls present.

### 6. Billing & revenue
1. List PAID obligation → refund partial → `PARTIALLY_REFUNDED`; audit.
2. Refund remainder → `REFUNDED`; further refund blocked.
3. Revenue summary gross/refunds/net for 30d.
4. Mark dispute → status/note + audit.

### 7. AI governance
1. Disable global patient AI → patient AI entry shows unavailable.
2. Disable AI for one user → only that user blocked.
3. Review flagged conversation → reviewedAt set; clinical signed artifacts unchanged.

### 8. Settings & maintenance
1. Toggle maintenance ON → patient/doctor see maintenance; admin portal still works.
2. Update support contact → persists; audit before/after.
3. Invalid empty required → validation error.

### 9. System health & audit
1. Healthy DB → overall HEALTHY; dashboard status matches.
2. List audit filter by actor/type → suspend event visible.
3. Export audit CSV ≤10k → download + `admin.export.audit` event.
4. No edit/delete controls on audit rows.

### 10. Analytics & notifications
1. Analytics period 30d → charts/tables update; empty period → empty state.
2. Export analytics → audited.
3. Admin notification for pending approval → mark read; All Caught Up when none.
4. AR locale → RTL shell; labels present.

### 11. Roles
1. View role matrix.
2. Assign ADMIN to eligible user (or invite) → audited.
3. IdP/non-admin cannot access `/admin`.

## Expected outcomes

- All scenarios pass without PHI in URLs or client error stacks.
- Visual QA against `design/` PNGs for shell + dashboard + ≥3 management pages (SC-009).
