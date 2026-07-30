# Research: Authentication & Authorization (RBAC)

**Date**: 2026-07-29 | **Plan**: [plan.md](./plan.md)

Stack mandated by product: Next.js 15 App Router, TypeScript strict, Auth.js v5, Prisma, Neon PostgreSQL, Tailwind, shadcn/ui, Zod. Research resolves how to apply that stack to the clarified spec (database sessions, Remember Me, flat RBAC, healthcare-oriented controls).

## D1. Auth.js v5 session strategy

- **Decision**: Auth.js **database sessions** via `@auth/prisma-adapter` (Prisma `Session` model) as source of truth; opaque session cookie.
- **Rationale**: Spec rejects JWT-only trust for v1 healthcare access; database sessions enable immediate revoke on logout, deactivate, password reset, and refresh reuse.
- **Alternatives considered**: JWT strategy (fast, hard to revoke); hybrid access JWT + DB refresh only (more moving parts; session cookie + DB Session is enough for first-party web app).

## D2. Credentials provider + custom password hashing

- **Decision**: Auth.js Credentials provider; Hakeem stores `passwordHash` with **Argon2id** (`@node-rs/argon2` preferred for Node performance); `authorize()` verifies hash and account gates.
- **Rationale**: Spec requires Argon2id (bcrypt acceptable); Credentials keeps email/password UX under our control; Auth.js still owns session lifecycle.
- **Alternatives considered**: Auth.js Email magic-link only (spec requires passwords); Clerk/Auth0 (external IdP — out of mandated stack); bcrypt-only (acceptable fallback if Argon2 native builds fail on target CI — document fallback).

## D3. Remember Me / refresh credentials

- **Decision**: Separate `RefreshCredential` table (hashed token, family id, expiresAt); issued only when Remember Me checked; rotate on use; reuse → revoke family; absolute ≤ 30 days.
- **Rationale**: Matches clarified spec; keeps Auth.js session idle/absolute short while allowing long continuity without permanent password-equivalent cookies.
- **Alternatives considered**: Stretching Auth.js session `maxAge` to 30 days without refresh (weaker theft response); sliding cookie only (no server revoke granularity).

## D4. Idle timeouts by role

- **Decision**: Enforce idle in session `update`/middleware touch logic: 30m Patient/Doctor, 15m Admin; absolute 12h without refresh.
- **Rationale**: Spec clarification; stricter admin idle reduces privileged console exposure.
- **Alternatives considered**: Single idle for all roles (simpler but weaker for admin); sliding absolute only (ignores idle requirement).

## D5. Flat RBAC encoding

- **Decision**: `UserRole` enum on `User`; permission constants map role → permission set in `src/auth/rbac.ts`; no role hierarchy table in v1.
- **Rationale**: Spec: one primary role, no inheritance; keeps authorization reviews simple and testable.
- **Alternatives considered**: CASL/permission tables per user (overkill for three roles); hierarchical roles (explicitly rejected).

## D6. Doctor approval vs CMS Doctor profile

- **Decision**: Auth `User` with `role=DOCTOR` and `DoctorApprovalStatus`; public marketing `Doctor` Prisma model remains content/SEO entity; optional later `doctorProfileId` link.
- **Rationale**: Avoid blocking auth module on CMS doctor publishing; clinical login identity ≠ public profile card.
- **Alternatives considered**: Single merged Doctor+User model (couples SEO drafts to login — risky); forcing CMS publish before login (wrong lifecycle).

## D7. Token storage for verify/reset

- **Decision**: Store **hashed** challenge tokens in `EmailChallenge` / `PasswordResetChallenge` (or unified `AuthChallenge` with `kind`); never store raw tokens; TTL 24h verify / 1h reset.
- **Rationale**: Spec single-use + TTL; hashing limits DB leak impact; separate kinds keep rate-limit counters clear.
- **Alternatives considered**: Auth.js `VerificationToken` only (usable but awkward for password reset + custom rate limits); plaintext tokens (unacceptable).

## D8. Rate limiting & lockout

- **Decision**: Account lockout after 5 failures / 15 minutes (fields on `User`); origin rate limit via Upstash Redis Ratelimit in production, in-memory Map limiter for local/dev; email send limits in challenge service.
- **Rationale**: Spec dual control (account + origin); Upstash fits Vercel serverless; local fallback keeps DX.
- **Alternatives considered**: Origin-only (misses targeted password spray on one account); CAPTCHA on login (a11y/friction — deferred).

## D9. CSRF strategy with Server Actions

- **Decision**: Prefer **Server Actions** for auth mutations (Next.js origin checks) + Auth.js cookie SameSite; for any Route Handler POST, require CSRF token or Auth.js built-in protections; document SameSite=Lax default, Strict for admin host paths when viable.
- **Rationale**: Spec requires CSRF on cookie-authenticated mutations; Server Actions reduce custom CSRF surface.
- **Alternatives considered**: Double-submit cookies everywhere (more client wiring); disabling SameSite (unsafe).

## D10. Email delivery

- **Decision**: `EmailSender` interface; v1 implementation Resend (or SMTP) with templates for verify, reset, doctor invite, admin invite; outbound from server only.
- **Rationale**: Spec email-only notifications; interface allows provider swap without touching auth flows.
- **Alternatives considered**: Console logger only (insufficient beyond local); SMS (out of scope).

## D11. Middleware composition with next-intl

- **Decision**: Compose `next-intl` middleware with Auth.js `auth` wrapper (official pattern: chain or nested); locale prefix preserved on all auth redirects.
- **Rationale**: Existing app already uses `next-intl`; auth must not break EN/AR routing.
- **Alternatives considered**: Separate auth subdomain (extra ops); dropping locale on auth pages (fails FR-025).

## D12. Testing approach

- **Decision**: Vitest for policy/RBAC/hash/lockout; Playwright for full auth journeys + Stitch route presence; integration tests with test DB for session revoke and approval gates.
- **Rationale**: User explicitly requested unit, integration, authz, and security tests in tasking.
- **Alternatives considered**: E2E-only (slow feedback on policy); mocking Auth.js entirely (misses adapter regressions).

## D13. Stitch UI asset availability

- **Decision**: Treat approved Stitch auth screens as mandatory implementation input; export into `specs/002-auth-rbac/design/` before UI implementation tasks; do not redesign.
- **Rationale**: Spec FR-024/FR-029; during planning Stitch MCP returned 401 and no auth design files exist in-repo (unlike Module 0 public site designs).
- **Alternatives considered**: Inventing interim UI (violates product rule); blocking entire backend (unnecessary — data/API can proceed).

## D14. Public site CTA handoff

- **Decision**: Update Module 0 Register/Login CTAs from external `NEXT_PUBLIC_APP_URL` to in-app `/{locale}/login` and `/{locale}/register`.
- **Rationale**: Auth module now lives in the same Next.js app; keeps locale continuity.
- **Alternatives considered**: Keeping external app URLs (duplicates auth); iframe embed (poor a11y/security).

All Technical Context items resolved — no remaining NEEDS CLARIFICATION.
