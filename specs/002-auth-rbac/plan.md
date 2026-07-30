# Implementation Plan: Authentication & Authorization (RBAC)

**Branch**: `002-auth-rbac` | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-auth-rbac/spec.md`

## Summary

Implement Hakeem’s security foundation: email/password authentication via **Auth.js v5**, **database-backed sessions** on **Neon PostgreSQL** through **Prisma**, flat **RBAC** (Patient / Doctor / Administrator), server-side authorization on every protected request, and Stitch-faithful auth UI screens (EN/AR). Patients self-register with email verification; doctors are admin-provisioned and explicitly approved; administrators are invite/bootstrap-only. Remember Me uses rotating opaque refresh credentials; idle/absolute timeouts, lockout, rate limiting, CSRF, secure cookies, and append-only audit logging meet the clarified enterprise controls. OAuth and MFA are extension-ready but not shipped in v1.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), Node.js 20 LTS

**Primary Dependencies**: Next.js 15 (App Router, RSC, Route Handlers, Server Actions), Auth.js v5 (`next-auth@5` / `@auth/prisma-adapter`), Prisma ORM 6.x, Zod, Tailwind CSS, shadcn/ui, `next-intl`, `@node-rs/argon2` (or `argon2`) for password hashing, Upstash Ratelimit (or in-process limiter for local) for auth rate limits

**Storage**: Neon PostgreSQL via Prisma (`DATABASE_URL` pooled + `DIRECT_URL`); Auth.js Prisma adapter tables + Hakeem extensions (role, account status, refresh credentials, audit events, password history)

**Testing**: Vitest (unit: Zod schemas, RBAC helpers, password policy, lockout), Playwright (auth journeys US1–US8, CSRF/negative paths), security-focused integration tests for session revocation and cross-role matrix

**Target Platform**: Vercel (Node runtime for auth routes; middleware on Edge where session cookie presence + JWT/session token decode is Edge-safe — prefer Auth.js middleware patterns); evergreen browsers; mobile-first Stitch layouts

**Project Type**: Web application (extend existing single Next.js app from `001-public-website`)

**Performance Goals**: Login ≤ 30 s user-perceived (SC-002); auth API p95 &lt; 500 ms under normal load; session validation overhead negligible on protected RSC/route handlers

**Constraints**: Spec security controls (idle/absolute sessions, Remember Me refresh rotation, Argon2id, lockout 5/15m, origin rate limit, HttpOnly Secure SameSite cookies, CSRF, audit ≥ 365 days); no doctor/admin public self-registration; flat RBAC; Stitch UI source of truth; bilingual EN/AR

**Scale/Scope**: Auth screens (~8–10 routes × 2 locales); users expected to grow from hundreds → tens of thousands; ≤ 5 concurrent sessions/user; audit append-only volume proportional to auth events

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` remains an unfilled template — **PASS by default**. Applied discipline: single-app extension (no new service), Auth.js + Prisma over custom crypto stacks, RBAC helpers co-located with auth domain, no speculative microservices.

**Post-Phase 1 re-check**: Design adds Auth.js adapter + domain tables (refresh, audit, password history) required by clarified spec — justified. Separate public `Doctor` CMS model retained; auth `User` links optionally later — avoids conflating marketing profiles with login identity. **PASS**.

## Authentication Architecture

```text
Browser (Stitch UI)
  → Server Actions / Route Handlers (Zod-validated)
  → Auth domain services (register, verify, reset, change-password, lockout)
  → Auth.js Credentials provider (authorize → load User, verify Argon2id hash, status gates)
  → Auth.js session strategy: database sessions (Prisma Session)
  → Optional RefreshCredential (Remember Me) with rotation + reuse detection
  → AuditLogger.append(...)
  → Email sender (verification / reset / invites)
```

- **Provider (v1)**: Credentials (email + password) only.
- **Adapter**: `@auth/prisma-adapter` against Neon/Prisma.
- **Password verify**: Custom `authorize()`; passwords never stored by Auth.js Credentials — Hakeem owns `User.passwordHash`.
- **Post-login gates** (in `authorize` and session callbacks): `emailVerified`, `status === ACTIVE`, not locked, role-appropriate.
- **Session cookie**: Opaque session token (Auth.js database session); HttpOnly, Secure, SameSite=Lax (Strict for `/admin` when compatible).
- **Remember Me**: On success, create `RefreshCredential`; middleware/route can silently refresh absolute window up to 30 days; without Remember Me, no refresh row.

## Authorization Architecture

```text
Request
  → next-intl + auth middleware (locale + session presence + coarse route gates)
  → RSC / Server Action / Route Handler
  → requireSession() → requireRole(...roles) | requirePermission(perm)
  → domain logic
```

- **Never** rely on client-only hides.
- **Permission matrix** coded as constants (`src/auth/rbac.ts`); v1 maps permissions → roles (flat).
- **Admin console** and **doctor app** route prefixes enforced in middleware *and* re-checked in server helpers (defense in depth).

## RBAC Strategy

| Role | Code | Notes |
|------|------|--------|
| Patient | `PATIENT` | Self-register; email verify required |
| Doctor | `DOCTOR` | Admin create + explicit approve; no public register |
| Administrator | `ADMIN` | Bootstrap + invite only; 15m idle |

- One primary `role` per user (enum on `User`).
- **No inheritance**: `ADMIN` ≠ doctor clinical permissions; `DOCTOR` ≠ admin.
- Helpers: `hasRole(user, roles[])`, `assertRole`, `can(user, permission)`.

## Session Strategy

| Mode | Idle | Absolute | Refresh |
|------|------|----------|---------|
| Default | 30m Patient/Doctor; 15m Admin | 12h | None |
| Remember Me | Same idle while using session | Up to 30d via refresh | Opaque rotating refresh, hashed at rest |

- **Source of truth**: Prisma `Session` (database strategy) — immediate revoke on logout, deactivate, reset, refresh reuse.
- **Cap**: 5 sessions/user; 6th login deletes LRU session.
- **Device management**: list/revoke own sessions; admin force-revoke all.

## Middleware & Route Protection

```text
src/middleware.ts
  1. next-intl locale negotiation
  2. Auth.js auth wrapper (get token/session cookie)
  3. Match route class:
     - public: marketing + auth pages (login/register/…)
     - auth-only guest: redirect authenticated users away from login/register
     - protected patient: require PATIENT (+ verified)
     - protected doctor: require DOCTOR + ACTIVE
     - protected admin: require ADMIN
     - shared authenticated: any valid session
  4. On fail → redirect to /{locale}/login?next=… | /unauthorized | /access-denied | /session-expired
```

Route examples (locale-prefixed):

```text
/{locale}/login
/{locale}/register                 # Patient only
/{locale}/forgot-password
/{locale}/reset-password
/{locale}/verify-email
/{locale}/unauthorized
/{locale}/access-denied
/{locale}/session-expired
/{locale}/account/change-password
/{locale}/account/sessions
/{locale}/admin/...                # ADMIN
/{locale}/doctor/...               # DOCTOR (shell for later clinical modules)
/{locale}/patient/...              # PATIENT (shell)
```

Public marketing routes from Module 0 remain public; CTAs point to locale auth routes (update Module 0 handoff URLs from external app to in-app auth).

## Folder Structure

### Documentation (this feature)

```text
specs/002-auth-rbac/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── ui-review.md
├── contracts/
│   ├── auth-api.md
│   ├── rbac.md
│   └── audit-events.md
└── tasks.md                      # /speckit-tasks
```

### Source Code (repository root — extend existing app)

```text
prisma/
├── schema.prisma                 # + Auth models / enums
├── seed.ts                       # bootstrap ADMIN + demo PATIENT
└── migrations/

src/
├── auth/
│   ├── index.ts                  # NextAuth export (handlers, auth, signIn, signOut)
│   ├── config.ts                 # NextAuthConfig (providers, callbacks, pages, session)
│   ├── credentials.ts            # authorize() + status/lockout gates
│   ├── passwords.ts              # hash/verify Argon2id + policy + history
│   ├── rbac.ts                   # roles, permissions, assert helpers
│   ├── session.ts                # requireSession, touch idle, concurrent cap
│   ├── refresh.ts                # Remember Me issue/rotate/revoke
│   ├── tokens.ts                 # email verify + password reset challenge helpers
│   ├── rate-limit.ts             # account + origin limiters
│   ├── audit.ts                  # append-only SecurityAuditEvent writer
│   ├── email.ts                  # send verification/reset/invite (provider interface)
│   └── errors.ts                 # typed AuthError codes → safe client messages
├── app/
│   ├── api/auth/[...nextauth]/route.ts
│   ├── api/auth/refresh/route.ts           # optional refresh endpoint
│   └── [locale]/
│       ├── (auth)/
│       │   ├── login/page.tsx
│       │   ├── register/page.tsx
│       │   ├── forgot-password/page.tsx
│       │   ├── reset-password/page.tsx
│       │   ├── verify-email/page.tsx
│       │   ├── unauthorized/page.tsx
│       │   ├── access-denied/page.tsx
│       │   └── session-expired/page.tsx
│       ├── account/
│       │   ├── change-password/page.tsx
│       │   └── sessions/page.tsx
│       ├── admin/
│       │   ├── layout.tsx                  # requireRole(ADMIN)
│       │   ├── users/page.tsx
│       │   └── doctors/page.tsx            # provision/approve doctors
│       ├── doctor/layout.tsx               # requireRole(DOCTOR) shell
│       └── patient/layout.tsx              # requireRole(PATIENT) shell
├── components/auth/                        # Stitch-faithful forms & alerts
│   ├── login-form.tsx
│   ├── register-form.tsx
│   ├── forgot-password-form.tsx
│   ├── reset-password-form.tsx
│   ├── verify-email-panel.tsx
│   ├── change-password-form.tsx
│   ├── session-list.tsx
│   └── auth-alert.tsx                      # error/success/loading states
├── actions/auth/                           # Server Actions
│   ├── register.ts
│   ├── verify-email.ts
│   ├── forgot-password.ts
│   ├── reset-password.ts
│   ├── change-password.ts
│   └── sessions.ts
├── lib/
│   ├── prisma.ts
│   └── env.ts                              # Zod-parsed env
└── middleware.ts                           # intl + auth gates

tests/
├── unit/auth/
├── integration/auth/
└── e2e/auth/
```

**Structure Decision**: Single Next.js app extension; auth domain isolated under `src/auth/` + `(auth)` route group; admin/doctor/patient shells prepared for later modules.

## Prisma Schema (Auth additions — conceptual)

See [data-model.md](./data-model.md) for full field list. Additions to existing `schema.prisma`:

- Enums: `UserRole`, `AccountStatus`, `DoctorApprovalStatus`, `AuditOutcome`
- Models: `User`, `Account` (OAuth placeholder), `Session`, `VerificationToken` (Auth.js), `EmailChallenge`, `PasswordResetChallenge`, `RefreshCredential`, `PasswordHistory`, `SecurityAuditEvent`
- Note: Keep public CMS `Doctor` model separate; optional `User.doctorProfileId` FK later

## Validation Strategy

- **Boundary**: Zod schemas for all Server Actions and auth API bodies (`registerSchema`, `loginSchema`, `resetPasswordSchema`, …).
- **Domain**: Password policy function shared by register/reset/change.
- **UI**: React Hook Form + Zod resolver; inline field errors + form-level `AuthAlert` matching Stitch error/success patterns.
- **Env**: `src/lib/env.ts` Zod parse at boot (`AUTH_SECRET`, `DATABASE_URL`, `EMAIL_*`, etc.).

## API Contracts

Documented in `contracts/auth-api.md` (Server Actions + Auth.js routes + admin mutations). Errors use stable codes (`EMAIL_IN_USE`, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_INACTIVE`, `FORBIDDEN`, `CSRF`, `RATE_LIMITED`, …) mapped to safe, localized user messages.

## Error Handling

- Throw typed `AuthDomainError` with code; actions catch → return `{ ok: false, code }` (never stack traces).
- Anti-enumeration: register/forgot-password always succeed at UI layer when appropriate.
- Middleware redirects: unauthenticated → login; authenticated wrong role → access-denied; expired session cookie → session-expired.

## Audit Logging

`SecurityAuditEvent` append-only; writer `audit.log({ type, actorUserId?, targetUserId?, outcome, meta })`. Required events listed in `contracts/audit-events.md`. Retention ≥ 365 days (operational purge job later; no hard-delete API in v1).

## Security Strategy

| Control | Implementation |
|---------|------------------|
| Password hashing | Argon2id |
| Cookies | HttpOnly, Secure, SameSite=Lax/Strict |
| CSRF | Auth.js + SameSite; Server Actions origin checks; explicit tokens for non-Action POSTs |
| Rate limit | Per-account lockout + per-IP login/email limits |
| Sessions | DB sessions; revoke on security events |
| Transport | HTTPS only in production |
| Secrets | `AUTH_SECRET` ≥ 32 bytes; challenge tokens hashed at rest |

## Future OAuth Integration

- Keep Auth.js `Account` + `User` relation (adapter).
- v1: no OAuth providers registered.
- Later: add Google/Apple providers; link only after verified-email match; never auto-set `DOCTOR`/`ADMIN`.

## Future MFA Integration

- Reserve `MfaFactor` model (unused in v1).
- Auth.js `signIn` callback / custom credentials continuation: after password OK, if MFA required → redirect to `/mfa/challenge` before creating full session.
- First method: TOTP; mandatory cohorts: Admin + Doctor.

## UI Review

See [ui-review.md](./ui-review.md). **Stitch MCP was not readable in this planning session (401)**. Approved auth screens are **not present** under `specs/002-auth-rbac/design/`. Implementation MUST block visual build until Stitch assets are exported into that folder; do not invent a new design system.

## Complexity Tracking

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|------------|-------------------------------------|
| RefreshCredential + Session | Spec Remember Me + immediate revoke | JWT-only absolute expiry cannot revoke refresh theft cleanly |
| Separate EmailChallenge vs Auth.js VerificationToken | Distinct TTL/rate-limit semantics for verify vs reset | Overloading one token table obscures audit and expiry rules |
| PasswordHistory table | Last-5 reuse ban (spec) | Checking only current hash insufficient |

## Project Structure (docs reminder)

Phase 0–1 outputs: `research.md`, `data-model.md`, `contracts/*`, `quickstart.md`, `ui-review.md`. Tasks via `/speckit-tasks` → `tasks.md`.
