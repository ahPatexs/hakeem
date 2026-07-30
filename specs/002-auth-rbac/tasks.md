# Tasks: Authentication & Authorization (RBAC)

**Input**: Design documents from `/specs/002-auth-rbac/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [ui-review.md](./ui-review.md), [quickstart.md](./quickstart.md)

**Tests**: Included (explicitly requested: unit, integration, authentication, authorization, security).

**UI gate**: Export Stitch auth designs to `specs/002-auth-rbac/design/` before UI implementation tasks (see T020). Do not redesign.

**Organization**: Setup â†’ Foundational â†’ User stories US1â€“US9 â†’ Polish

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable (different files, no incomplete deps)
- **[Story]**: [US1]â€¦[US9] for story phases only

## Path Conventions

Single Next.js app: `src/`, `prisma/`, `tests/` at repository root (extends Module 0).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, env, Auth.js/Prisma scaffolding

- [x] T001 Install auth dependencies (`next-auth@5`, `@auth/prisma-adapter`, `@node-rs/argon2` or `argon2`, rate-limit client) in `package.json`
- [x] T002 [P] Add Zod-validated env schema for `AUTH_SECRET`, `AUTH_URL`, `DATABASE_URL`, `DIRECT_URL`, email keys in `src/lib/env.ts`
- [x] T003 [P] Document required `.env.example` entries for Auth.js + Neon + email in `.env.example`
- [x] T004 Create auth domain folder skeleton `src/auth/` (`index.ts`, `config.ts`, `passwords.ts`, `rbac.ts`, `audit.ts`, `errors.ts`)
- [x] T005 [P] Add auth message namespaces to `src/i18n/messages/en.json` and `src/i18n/messages/ar.json` (`auth.*` errors/success/labels)
- [x] T006 [P] Create Vitest/Playwright test folders `tests/unit/auth/`, `tests/integration/auth/`, `tests/e2e/auth/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, Auth.js wiring, middleware, RBAC, hashing, audit â€” required before any user story

**âš ï¸ CRITICAL**: No user story work until this phase completes

- [x] T007 Extend `prisma/schema.prisma` with enums `UserRole`, `AccountStatus`, `DoctorApprovalStatus`, `AuthChallengeKind`, `AuditOutcome` per `data-model.md`
- [x] T008 Add Prisma models `User`, `Account`, `Session`, `VerificationToken`, `AuthChallenge`, `RefreshCredential`, `PasswordHistory`, `SecurityAuditEvent` (optional stub `MfaFactor`) in `prisma/schema.prisma`
- [x] T009 Create and apply migration for auth models via `npx prisma migrate dev`
- [x] T010 Implement password policy + Argon2id hash/verify + last-5 history helpers in `src/auth/passwords.ts`
- [x] T011 [P] Implement flat RBAC helpers and permission matrix in `src/auth/rbac.ts` per `contracts/rbac.md`
- [x] T012 [P] Implement append-only audit writer in `src/auth/audit.ts` per `contracts/audit-events.md`
- [x] T013 [P] Implement typed `AuthDomainError` codes in `src/auth/errors.ts` per `contracts/auth-api.md`
- [x] T014 Implement Auth.js v5 config (database sessions, Credentials provider stub, pages, callbacks) in `src/auth/config.ts`
- [x] T015 Export Auth.js `handlers`, `auth`, `signIn`, `signOut` from `src/auth/index.ts` and mount `src/app/api/auth/[...nextauth]/route.ts`
- [x] T016 Implement challenge token create/consume (hashed, TTL) in `src/auth/tokens.ts`
- [x] T017 [P] Implement rate-limit + lockout helpers in `src/auth/rate-limit.ts`
- [x] T018 [P] Implement `EmailSender` interface + console/Resend adapter in `src/auth/email.ts`
- [x] T019 Compose `src/middleware.ts` with `next-intl` + Auth.js route gates (public/auth/patient/doctor/admin) per plan
- [ ] T020 Import approved Stitch auth screens into `specs/002-auth-rbac/design/` (manifest + desktop/mobile); confirm `ui-review.md` checklist can start â€” **UI tasks blocked until done**
- [x] T021 [P] Seed bootstrap `ADMIN` (+ optional demo `PATIENT`) in `prisma/seed.ts`
- [x] T022 [P] Unit tests for password policy/hashing in `tests/unit/auth/passwords.test.ts`
- [x] T023 [P] Unit tests for RBAC matrix in `tests/unit/auth/rbac.test.ts`

**Checkpoint**: Auth foundation ready â€” stories can proceed (UI after T020)

---

## Phase 3: User Story 1 â€” Patient register & verify email (P1) ðŸŽ¯ MVP

**Goal**: Patients self-register, receive verification, verify within 24h, gated until verified  
**Independent Test**: Register â†’ verify â†’ status ACTIVE; unverified blocked from patient portal

### Tests

- [x] T024 [P] [US1] Integration test register + verify + duplicate email anti-enumeration in `tests/integration/auth/register-verify.test.ts`
- [x] T025 [P] [US1] Unit test AuthChallenge TTL/single-use in `tests/unit/auth/tokens.test.ts`

### Implementation

- [x] T026 [US1] Implement `registerPatient` Server Action in `src/actions/auth/register.ts`
- [x] T027 [US1] Implement `verifyEmail` + resend action with rate limits in `src/actions/auth/verify-email.ts`
- [x] T028 [US1] Wire Credentials `authorize` gates for `EMAIL_NOT_VERIFIED` / inactive in `src/auth/credentials.ts`
- [x] T029 [US1] Build Register page from Stitch in `src/app/[locale]/(auth)/register/page.tsx` + `src/components/auth/register-form.tsx`
- [x] T030 [US1] Build Verify Email page/states from Stitch in `src/app/[locale]/(auth)/verify-email/page.tsx` + `src/components/auth/verify-email-panel.tsx`
- [x] T031 [US1] Shared `AuthAlert` loading/error/success in `src/components/auth/auth-alert.tsx`
- [x] T032 [US1] Playwright e2e patient register/verify in `tests/e2e/auth/register-verify.spec.ts`

**Checkpoint**: US1 MVP â€” patients can register and verify

---

## Phase 4: User Story 2 â€” Login, trusted session, Remember Me (P1)

**Goal**: Verified patients login, DB session, optional Remember Me refresh, logout, role redirects  
**Independent Test**: Login with/without Remember Me; logout invalidates; wrong role denied

### Tests

- [x] T033 [P] [US2] Integration test session create/logout/revoke in `tests/integration/auth/session.test.ts`
- [x] T034 [P] [US2] Security test cookie flags (HttpOnly/Secure/SameSite) in `tests/integration/auth/cookies.test.ts`

### Implementation

- [x] T035 [US2] Complete Credentials `authorize` + session callbacks (role, idle expiry) in `src/auth/credentials.ts` / `src/auth/config.ts`
- [x] T036 [US2] Implement Remember Me refresh issue/rotate/reuse-revoke in `src/auth/refresh.ts` + optional `src/app/api/auth/refresh/route.ts`
- [x] T037 [US2] Implement session touch/idle/absolute helpers + concurrent cap (5) in `src/auth/session.ts`
- [x] T038 [US2] Build Login page from Stitch in `src/app/[locale]/(auth)/login/page.tsx` + `src/components/auth/login-form.tsx`
- [x] T039 [US2] Add post-login redirects by role and guest-away-from-login behavior in `src/middleware.ts`
- [x] T040 [US2] Build Unauthorized + Session Expired pages from Stitch in `src/app/[locale]/(auth)/unauthorized/page.tsx` and `session-expired/page.tsx`
- [x] T041 [US2] Playwright e2e login/logout/remember-me in `tests/e2e/auth/login.spec.ts`

**Checkpoint**: US2 â€” trusted sessions working

---

## Phase 5: User Story 3 â€” Forgot / reset / change password (P1)

**Goal**: Reset via 1h token; change password when authenticated; revoke sessions per spec  
**Independent Test**: Reset kills all sessions; change kills other sessions; reused token fails

### Tests

- [x] T042 [P] [US3] Integration test reset + session invalidation in `tests/integration/auth/password-reset.test.ts`
- [x] T043 [P] [US3] Unit test password history rejection in `tests/unit/auth/password-history.test.ts`

### Implementation

- [x] T044 [US3] Implement `requestPasswordReset` + `resetPassword` actions in `src/actions/auth/forgot-password.ts` and `reset-password.ts`
- [x] T045 [US3] Implement `changePassword` action in `src/actions/auth/change-password.ts`
- [x] T046 [US3] Build Forgot + Reset pages from Stitch in `src/app/[locale]/(auth)/forgot-password/page.tsx` and `reset-password/page.tsx` + forms under `src/components/auth/`
- [x] T047 [US3] Build Change Password page in `src/app/[locale]/account/change-password/page.tsx` + `src/components/auth/change-password-form.tsx`
- [x] T048 [US3] Playwright e2e password recovery/change in `tests/e2e/auth/password.spec.ts`

**Checkpoint**: US3 â€” recovery and password change complete

---

## Phase 6: User Story 4 â€” Admin creates & approves doctors (P1)

**Goal**: No doctor self-register; admin create â†’ pending â†’ approve/invite â†’ active login  
**Independent Test**: Pending doctor cannot login; approved+password can; reject blocks

### Tests

- [x] T049 [P] [US4] Integration test doctor provisioning state machine in `tests/integration/auth/doctor-provision.test.ts`
- [x] T050 [P] [US4] Authz test public doctor register absent / blocked in `tests/e2e/auth/no-doctor-register.spec.ts`

### Implementation

- [x] T051 [US4] Implement admin actions `createDoctorUser`, `approveDoctor`, `rejectDoctor` in `src/actions/auth/admin-doctors.ts`
- [x] T052 [US4] Implement invite set-password consume path in `src/actions/auth/accept-invite.ts`
- [x] T053 [US4] Enforce doctor approval gates in `src/auth/credentials.ts`
- [x] T054 [US4] Build admin doctors provisioning UI (Stitch or minimal token-aligned) in `src/app/[locale]/admin/doctors/page.tsx`
- [x] T055 [US4] Ensure register route only creates PATIENT (server + UI) in `src/actions/auth/register.ts` / register form
- [x] T056 [US4] Playwright e2e admin approve doctor login in `tests/e2e/auth/doctor-approve.spec.ts`

**Checkpoint**: US4 â€” doctor provisioning secure

---

## Phase 7: User Story 5 â€” Doctor login under RBAC (P2)

**Goal**: Approved doctors use doctor shell; denied admin routes  
**Independent Test**: Doctor reaches `/doctor`, denied `/admin`

### Tests

- [x] T057 [P] [US5] Authorization matrix test doctor routes in `tests/integration/auth/rbac-doctor.test.ts`

### Implementation

- [x] T058 [US5] Add `src/app/[locale]/doctor/layout.tsx` with `requireRole('DOCTOR')`
- [x] T059 [US5] Add doctor home shell page `src/app/[locale]/doctor/page.tsx`
- [x] T060 [US5] Build Access Denied page from Stitch in `src/app/[locale]/(auth)/access-denied/page.tsx`
- [x] T061 [US5] Playwright e2e doctor access matrix in `tests/e2e/auth/doctor-rbac.spec.ts`

**Checkpoint**: US5 â€” doctor RBAC path verified

---

## Phase 8: User Story 6 â€” Admin user management (P2)

**Goal**: List users, status changes, role assign, invite admin, last-admin protection  
**Independent Test**: Status/role changes affect login; cannot remove last admin

### Tests

- [x] T062 [P] [US6] Integration test last-admin protection + status revoke sessions in `tests/integration/auth/admin-users.test.ts`

### Implementation

- [x] T063 [US6] Implement admin user management actions in `src/actions/auth/admin-users.ts`
- [x] T064 [US6] Build admin users UI in `src/app/[locale]/admin/users/page.tsx` + `src/app/[locale]/admin/layout.tsx`
- [x] T065 [US6] Implement `inviteAdmin` + email verification requirement for ADMIN in `src/actions/auth/admin-users.ts` / credentials gates
- [x] T066 [US6] Playwright e2e admin user management in `tests/e2e/auth/admin-users.spec.ts`

**Checkpoint**: US6 â€” admin governance complete

---

## Phase 9: User Story 7 â€” Unauthorized, lockout, rate limit, CSRF (P1)

**Goal**: Hardening â€” lockout, origin limits, CSRF, authz denials audited  
**Independent Test**: 5 fails â†’ lock; origin throttle; forged mutation rejected; denials audited

### Tests

- [x] T067 [P] [US7] Security tests lockout + origin rate limit in `tests/integration/auth/lockout-ratelimit.test.ts`
- [x] T068 [P] [US7] Security tests CSRF rejection on mutating routes in `tests/integration/auth/csrf.test.ts`
- [x] T069 [P] [US7] Integration test `authz.denied` audit emission in `tests/integration/auth/audit.test.ts`

### Implementation

- [x] T070 [US7] Wire lockout counters into login failure path in `src/auth/credentials.ts` / `src/auth/rate-limit.ts`
- [x] T071 [US7] Apply origin rate limits to login + challenge email sends in actions + credentials
- [x] T072 [US7] Verify Server Action / Auth.js CSRF posture documented and enforced; add checks in `src/auth/csrf.ts` if needed for Route Handlers
- [x] T073 [US7] Emit `authz.denied` from `requireRole` / middleware denials in `src/auth/rbac.ts` / middleware
- [x] T074 [US7] Playwright e2e lockout + access denied flows in `tests/e2e/auth/security.spec.ts`

**Checkpoint**: US7 â€” abuse controls verified

---

## Phase 10: User Story 8 â€” Session & device management (P2)

**Goal**: List/revoke sessions; 5-session cap; admin force revoke; refresh reuse  
**Independent Test**: Cap enforced; revoke works; refresh reuse kills family

### Tests

- [x] T075 [P] [US8] Integration test concurrent session cap + revoke in `tests/integration/auth/sessions-devices.test.ts`
- [x] T076 [P] [US8] Security test refresh reuse detection in `tests/integration/auth/refresh-reuse.test.ts`

### Implementation

- [x] T077 [US8] Implement session list/revoke/revoke-others/admin force-revoke actions in `src/actions/auth/sessions.ts`
- [x] T078 [US8] Build sessions UI in `src/app/[locale]/account/sessions/page.tsx` + `src/components/auth/session-list.tsx`
- [x] T079 [US8] Playwright e2e session management in `tests/e2e/auth/sessions.spec.ts`

**Checkpoint**: US8 â€” device/session control complete

---

## Phase 11: User Story 9 â€” Future OAuth & MFA readiness (P3)

**Goal**: Schema/hooks reserved; v1 ships without OAuth/MFA providers  
**Independent Test**: Account + MfaFactor models exist; no OAuth provider registered; sign-in pipeline documents MFA gap

### Tests

- [x] T080 [P] [US9] Unit/contract test that Auth.js providers list is credentials-only in `tests/unit/auth/providers.test.ts`

### Implementation

- [x] T081 [US9] Ensure Prisma `Account` + optional `MfaFactor` stub migrated and documented in `prisma/schema.prisma` / `research.md` cross-link
- [x] T082 [US9] Add MFA extension seam comment/hook in `src/auth/config.ts` (post-password pre-session) without enabling challenge UI
- [x] T083 [US9] Document OAuth linking rules in `specs/002-auth-rbac/contracts/auth-api.md` appendix if not already complete

**Checkpoint**: US9 â€” extensibility ready without v1 scope creep

---

## Phase 12: Polish & Cross-Cutting

**Purpose**: CTA handoff, a11y, DoD, production readiness

- [x] T084 [P] Point public Navbar/Footer Register/Login CTAs to `/{locale}/login` and `/{locale}/register` in `src/components/layout/navbar.tsx` / related CTA helpers
- [x] T085 [P] Complete `ui-review.md` checklist against exported Stitch (responsive, a11y, validation/error/success/loading)
- [x] T086 [P] Add patient portal shell `src/app/[locale]/patient/layout.tsx` + `page.tsx` with `requireRole('PATIENT')`
- [x] T087 Run full auth test suites (`npm run test:unit`, integration, `npm run test:e2e`) and fix failures
- [x] T088 Verify Definition of Done from quickstart (patient register, no doctor self-register, admin manage, RBAC, security controls)
- [x] T089 [P] Update Module 0 handoff notes / env docs if `NEXT_PUBLIC_APP_URL` auth URLs deprecated

---

## Dependencies & Story Order

```text
Phase 1 Setup â†’ Phase 2 Foundational (T020 Stitch import gates UI)
  â†’ US1 (MVP) â†’ US2 â†’ US3 â†’ US4
  â†’ US5 + US6 (after US4 for real doctor/admin users)
  â†’ US7 (hardening; can start after US2, completes after actions exist)
  â†’ US8 (after US2 sessions)
  â†’ US9 (can parallel after foundational schema)
  â†’ Polish
```

**Suggested MVP**: Phase 1â€“3 (Foundation + US1), then US2â€“US3 for usable auth.

### Parallel opportunities

- After T009: T010â€“T013, T017â€“T018, T022â€“T023 in parallel
- Within US1: T024â€“T025 parallel before/during T026â€“T028; UI T029â€“T030 after T020
- US5 and US6 can proceed in parallel after US4
- US9 parallel anytime after T008â€“T009

---

## Parallel example: Foundational

```bash
# After migration T009:
T010 passwords.ts | T011 rbac.ts | T012 audit.ts | T013 errors.ts | T017 rate-limit.ts | T018 email.ts
```

## Parallel example: US1

```bash
T024 integration register-verify | T025 unit tokens
# then
T026 register action â†’ T027 verify action â†’ T029/T030 UI (post T020)
```

---

## Implementation Strategy

1. **MVP**: Setup + Foundation + US1 (register/verify) + minimal login from US2  
2. **Hardening slice**: US2 sessions + US3 passwords + US7 lockout/CSRF  
3. **Governance slice**: US4â€“US6 admin/doctor  
4. **Device control**: US8  
5. **Extensibility**: US9 stubs  
6. **Polish**: CTA cutover, Stitch QA sign-off, full test gate, DoD

---

## Task summary

| Area | Tasks | Count |
|------|-------|-------|
| Setup | T001â€“T006 | 6 |
| Foundational | T007â€“T023 | 17 |
| US1 | T024â€“T032 | 9 |
| US2 | T033â€“T041 | 9 |
| US3 | T042â€“T048 | 7 |
| US4 | T049â€“T056 | 8 |
| US5 | T057â€“T061 | 5 |
| US6 | T062â€“T066 | 5 |
| US7 | T067â€“T074 | 8 |
| US8 | T075â€“T079 | 5 |
| US9 | T080â€“T083 | 4 |
| Polish | T084â€“T089 | 6 |
| **Total** | T001â€“T089 | **89** |

**Format validation**: All tasks use `- [ ]`, Task ID, optional `[P]`/`[USn]`, and file paths.

---

## Phase 13: Convergence

**Purpose**: Close gaps between spec/plan and current codebase after `/speckit-implement` (assessed 2026-07-29). Does not replace open **T020** (Stitch design export).

- [x] T090 Create and apply Prisma migration for auth models under `prisma/migrations/` per plan:T009 / data-model (`missing`)
- [x] T091 Align session trust with FR-015: prefer opaque DB-backed session cookie (or equivalent non-JWT-sole trust) validated server-side in `src/auth/config.ts` / `src/auth/session.ts` (`partial`)
- [x] T092 Complete Remember Me per FR-037/SC-013: set hashed refresh cookie on login, add `src/app/api/auth/refresh/route.ts` rotation + reuse revoke using `src/auth/refresh.ts` (`partial`)
- [x] T093 Implement admin `assignRole` Server Action + UI in `src/actions/auth/admin.ts` and `src/components/auth/admin-panels.tsx` per FR-012 / US6/AC3 with last-admin protection (`missing`)
- [x] T094 [P] Add auth integration/security/e2e suites under `tests/integration/auth/` and `tests/e2e/auth/` covering SC-003–SC-009 and SC-012–SC-015 (`missing`)
- [x] T095 Emit `authz.denied` audit events from `src/auth/guards.ts` / `src/middleware.ts` per FR-023 / US7 (`missing`)
- [x] T096 Add administrator unlock for locked accounts in `src/actions/auth/admin.ts` per FR-044 (`missing`)
- [x] T097 Configure Auth.js session/refresh cookies HttpOnly, Secure, SameSite=Lax (Strict for admin when compatible) in `src/auth/config.ts` per FR-046 (`partial`)
- [x] T098 Add CSRF enforcement helper `src/auth/csrf.ts` for cookie-authenticated Route Handler mutations per FR-047 (`partial`)
- [x] T099 Redirect idle/absolute expired sessions to `/{locale}/session-expired` from `src/middleware.ts` per FR-036 / US2 (`partial`)
- [x] T100 [P] Add `src/app/[locale]/patient/layout.tsx`, `doctor/layout.tsx`, and `admin/layout.tsx` with `requireRole` per plan layouts (`missing`)
- [x] T101 Implement production `EmailSender` (Resend/SMTP) behind `src/auth/email.ts` per plan:D10 (`partial`)
- [x] T102 Add MFA post-password / pre-session extension seam in `src/auth/config.ts` per FR-027 (`missing`)
- [x] T103 [P] Document future OAuth account-linking rules appendix in `specs/002-auth-rbac/contracts/auth-api.md` per FR-026 (`missing`)
- [x] T104 [P] Add audit retention ≥365 days policy + purge job stub for `SecurityAuditEvent` per FR-048 (`missing`)
- [x] T105 [P] Point Footer Login/Register CTAs to in-app auth routes in `src/components/layout/footer.tsx` per T084 / plan CTA handoff (`partial`)

