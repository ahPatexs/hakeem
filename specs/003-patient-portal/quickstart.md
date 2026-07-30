# Quickstart: Patient Portal validation

**Feature**: `003-patient-portal` | **Date**: 2026-07-29

Validate after implementation. Details: [data-model.md](./data-model.md), [contracts/patient-api.md](./contracts/patient-api.md), [ui-review.md](./ui-review.md).

## Prerequisites

- Module 1 auth working (`PATIENT` user)
- Postgres up (`docker compose up -d`) + migrations including patient-portal models
- `.env` with `DATABASE_URL`, `AUTH_SECRET`, storage/pay/video/AI keys as adapters require
- Stitch designs exported to `specs/003-patient-portal/design/` before UI sign-off

```bash
npm install
npx prisma migrate dev
npm run prisma:seed
npm run dev
```

Sign in: `patient@hakeem.local` / `Patient!Pass1234` → `/en/patient`.

## Scenarios

### 1. Dashboard (US1)
1. Open `/en/patient` — welcome + widgets render.
2. Empty patient → empty states + CTAs.
3. Break one widget dependency in test → others still show.

### 2. Profile & settings (US2)
1. Edit profile; save; reload persists.
2. Switch language AR; RTL shell.
3. Upload allowed PNG &lt;10MB; reject `.exe`.

### 3. Book appointment (US4–US5)
1. Find doctor → hold slot → confirm → appears in Upcoming.
2. Abandon hold &gt;10m → slot free.
3. Cancel outside 12h OK; inside 12h blocked.

### 4. Video (US6)
1. Confirmed VIDEO appointment inside join window → join token.
2. Outside window → `JOIN_WINDOW_CLOSED`.

### 5. Clinical (US7)
1. Seed RELEASED lab + ACTIVE Rx + record with PDF → list/detail/viewer.
2. PENDING_REVIEW lab hidden.
3. Other patient ID → NOT_FOUND.
4. Download emits audit event.

### 6. Payments (US8)
1. PENDING obligation on dashboard aggregate.
2. Pay once; retry does not double Paid.
3. History paginates.

### 7. Notifications (US9)
1. Create appointment → notification appears ≤1m.
2. Mark read / dismiss; deep link re-checks authz.

### 8. AI (US10)
1. Open `/patient/ai` — disclaimer visible.
2. Chat streams; cannot mutate prescriptions.
3. Rate limit after burst.

### 9. Authz matrix
1. Doctor/Admin session → `/patient` denied.
2. Logged out → login redirect.

## Automated

```bash
npm run test:unit          # domain rules
npm run test:e2e           # playwright patient specs
```

## Definition of Done

- Spec user stories US1–US10 demonstrable against Stitch UI
- Cross-patient denial 100% in automated tests
- PHI document routes `no-store` + audited
- EN/AR RTL checked on dashboard, booking, records
