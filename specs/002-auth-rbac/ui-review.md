# UI Review: Auth screens (Stitch source of truth)

**Date**: 2026-07-29 | **Feature**: `002-auth-rbac`  
**Rule**: Do **not** generate a new design. Implement approved Stitch only.

## Review status

| Check | Result |
|-------|--------|
| Stitch MCP access this session | **Failed (401)** — credentials invalid / not connected |
| Local design export `specs/002-auth-rbac/design/` | **Missing** — no auth PNG/HTML/manifest in repo |
| Module 0 public designs | Present under `specs/001-public-website/design/` (not auth) |

**Conclusion**: Visual QA against Stitch **cannot be completed** until designs are exported. Backend/domain implementation may proceed; **UI implementation tasks are gated** on design import.

## Required screens (validate when assets available)

| Screen | Spec / plan route | Must verify |
|--------|-------------------|-------------|
| Login | `/{locale}/login` | Email/password, Remember Me (if in Stitch), errors, loading, link to register/forgot |
| Register | `/{locale}/register` | Patient-only fields, validation UX, success → verify pending |
| Forgot Password | `/{locale}/forgot-password` | Anti-enumeration success state |
| Reset Password | `/{locale}/reset-password` | Token handling, policy errors, success |
| Verify Email | `/{locale}/verify-email` | Pending, success, expired/invalid, resend |
| Unauthorized | `/{locale}/unauthorized` | Unauthenticated messaging + CTA to login |
| Access Denied | `/{locale}/access-denied` | Authenticated wrong-role messaging |
| Session Expired | `/{locale}/session-expired` | Re-auth CTA |

Also expected for security (may be minimal if not in Stitch): Change Password, Session/Device list, Admin user/doctor management — **document gap if absent from Stitch** (spec allows minimal security UI without redesigning Stitch auth screens).

## Validation checklist (run after export)

### Responsive
- [ ] Mobile / tablet / desktop match Stitch breakpoints
- [ ] No horizontal scroll; touch targets ≥ 44px
- [ ] RTL (`ar`) mirrors correctly; LTR (`en`) intact

### Accessibility
- [ ] Labels associated with inputs; errors linked via `aria-describedby`
- [ ] Focus order logical; visible focus rings
- [ ] Contrast meets WCAG 2.2 AA against Stitch colors
- [ ] Keyboard submit; screen-reader announces errors/success

### Validation UX
- [ ] Inline field errors from Zod
- [ ] Password policy feedback without exposing timing attacks
- [ ] Disable double-submit while loading

### Error / success / loading
- [ ] Stitch error alert patterns for `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, etc.
- [ ] Success states for register/verify/reset
- [ ] Loading spinners/buttons per Stitch (no layout jump)

### Component reusability
- [ ] Shared `AuthAlert`, text field, primary/secondary buttons from shadcn mapped to Stitch tokens
- [ ] No one-off conflicting visual systems

## Missing business / design requirements (blockers & gaps)

Documented **before implementation**:

1. **Stitch auth asset export** — Required: Login, Register, Forgot, Reset, Verify Email, Unauthorized, Access Denied, Session Expired (desktop + mobile). Place under `specs/002-auth-rbac/design/` with manifest.
2. **Remember Me control** — Confirm whether Stitch Login includes Remember Me; if not, product must approve a minimal non-redesign addition or defer Remember Me UI (backend can still support via default-off).
3. **Admin provisioning UI** — Spec requires admin create/approve doctors and manage users; confirm Stitch has admin screens or approve a minimal admin console within existing design tokens.
4. **Session/device management UI** — Spec US8; confirm Stitch coverage or use allowed minimal security page.
5. **Post-login destinations** — Exact redirect targets for PATIENT / DOCTOR / ADMIN after login (shell home paths).
6. **Email template design** — Verification/reset/invite email layout not specified in Stitch web screens; need brand-safe transactional templates.
7. **Public CTA wiring** — Module 0 still may point Login/Register to external app URL; product confirms cutover to in-app auth routes.

Until (1) is resolved, treat UI tasks as **blocked** in `tasks.md`.
