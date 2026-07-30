# Quickstart: Auth & RBAC validation

**Feature**: `002-auth-rbac` | **Date**: 2026-07-29

Validation guide after implementation. Details: [data-model.md](./data-model.md), [contracts/auth-api.md](./contracts/auth-api.md), [contracts/rbac.md](./contracts/rbac.md).

## Prerequisites

- Node 20+, pnpm/npm
- Neon Postgres (or local Postgres) with `DATABASE_URL` + `DIRECT_URL`
- Env: `AUTH_SECRET` (≥32 chars), email provider keys (or ethereal/mailhog for local), `AUTH_URL` / `NEXTAUTH_URL` as required by Auth.js v5
- Stitch auth designs exported to `specs/002-auth-rbac/design/` before UI sign-off

## Setup

```bash
npm install
npx prisma migrate dev
npm run prisma:seed   # creates bootstrap ADMIN + optional demo PATIENT
npm run dev
```

Open `http://localhost:3000/ar/login` and `http://localhost:3000/en/login`.

## Scenarios

### 1. Patient register + verify (US1)
1. Register new patient → see verification pending UI.
2. Open verify link from email (or dev inbox) within 24h.
3. Login succeeds; `/patient` accessible; `/admin` → access denied.

### 2. Login session + Remember Me (US2)
1. Login without Remember Me → idle expires per role (use shortened test env overrides if needed).
2. Login with Remember Me → refresh row created; session survives longer absolute window.
3. Logout → session + refresh unusable.

### 3. Password reset (US3)
1. Forgot password → generic success.
2. Reset with token → password updated; old sessions dead.
3. Reused token fails.

### 4. Doctor provisioning (US4)
1. As ADMIN, create doctor → cannot login while pending.
2. Approve → invite set-password → doctor login works on `/doctor`.
3. Confirm no public doctor register route.

### 5. Lockout / rate limit (US7)
1. Fail login 5 times → locked 15m.
2. Excess origin attempts → RATE_LIMITED.

### 6. RBAC matrix (US5–US7)
1. PATIENT cannot open `/admin` or `/doctor`.
2. DOCTOR cannot open `/admin`.
3. Unauthenticated protected route → login redirect.

### 7. Sessions (US8)
1. Login on 6 “devices” (browsers/profiles) → only 5 sessions remain.
2. Revoke other sessions from account UI.

## Automated checks

```bash
npm run test:unit      # policy, rbac, hashing
npm run test:e2e       # Playwright auth suite
```

## Definition of Done (product)

- Patients securely register + verify + login/logout/reset/change password
- Doctors cannot self-register; admin create/approve works
- Administrators manage users/status/roles with last-admin protection
- RBAC enforced server-side across patient/doctor/admin shells
- Security controls from spec clarifications satisfied
- UI matches exported Stitch designs (no redesign)
- Ready for production hardening (secrets, HTTPS, email provider, Neon)
