# UI Review: Patient Portal (Stitch)

**Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Directive**: Review approved Stitch MCP design only. Do **not** generate a new UI.

## Review status

| Check | Result | Notes |
|-------|--------|-------|
| Stitch MCP access | **BLOCKED** | `list_projects` / design tools returned **401** (invalid OAuth) during planning |
| Design export in repo | **MISSING** | `specs/003-patient-portal/design/` is empty (no `manifest.json`, no screen PNGs/HTML) |
| Pixel validation vs Stitch | **NOT PERFORMED** | Cannot validate without authenticated Stitch access or exported assets |
| Implementation UI invent | **FORBIDDEN** | Per spec FR-005 — no interim redesign |

Same operational gap as Module 1 auth (`002-auth-rbac`): backend/domain planning may proceed; **UI implementation tasks remain gated** on design import.

## Screens to validate (when assets available)

| Area | Expected Stitch coverage | Spec alignment checklist |
|------|--------------------------|----------------------------|
| Dashboard | Welcome, widgets, quick actions | Caps 3/5/3/3; notif summary; payment status; widget isolation |
| Appointment screens | Find doctors, book, upcoming, history, detail | Hold/confirm UX; cancel/reschedule; empty lists |
| Medical records | List + detail + viewer | Loading/empty/error; document preview |
| AI assistant | Chat shell + disclaimer | Shortcut from dashboard; EN/AR |
| Profile | View/edit + uploads if any | Validation errors inline |
| Payments | Status + history + pay CTA | Outstanding vs paid |
| Notifications | Center + badge | Read/dismiss |
| Settings | Language + notification prefs | Persist + RTL |

## Verification matrix (run after export)

### Responsive design
- [ ] Desktop / tablet / mobile frames match Stitch breakpoints for each screen above
- [ ] No horizontal scroll on primary flows (dashboard, book, records)
- [ ] Touch targets ≥ Stitch specified hit areas on mobile

### Accessibility
- [ ] Focus order matches visual order
- [ ] Icon-only controls have accessible names
- [ ] Contrast on primary text/buttons meets WCAG 2.2 AA
- [ ] Error/empty messages not color-only

### Loading / empty / error
- [ ] Skeleton or Stitch loading variant per list/widget
- [ ] Empty states include primary CTA (Book / Find doctor / etc.)
- [ ] Error states include retry where safe
- [ ] Offline/submit failure does not show false success (aligns with FR-058)

### Component reusability & consistency
- [ ] Shared list row, badges, buttons, inputs match tokens across screens
- [ ] No one-off color/spacing systems outside Stitch tokens
- [ ] Portal shell (nav) consistent on all patient routes

### i18n / RTL
- [ ] Arabic frames exist or LTR frames have documented RTL mirroring rules
- [ ] Quick actions and payment CTAs not truncated in AR

## Missing requirements / blockers (document before implementation)

1. **Stitch OAuth / MCP auth** must be restored so agents can pull screens, or a designer must manually export.
2. **Export pack** required under `specs/003-patient-portal/design/`:
   - `manifest.json` (screen id → filename, breakpoint)
   - PNG (or PDF) for: Dashboard, Appointments (list/book/detail), Records, Labs, Prescriptions, AI, Profile, Payments, Notifications, Settings
   - Mobile + desktop where Stitch provides both
3. **Token mapping**: document Stitch color/type → Tailwind/CSS variables (may reuse Module 0 tokens if Stitch shares library).
4. **Unresolved design questions** (defer to export inspection — do not invent answers):
   - Exact waiting-room UI for video
   - Whether insurance-card upload appears on Profile or Medical Profile
   - Notification badge placement (header vs widget only)
   - Payment provider redirect vs in-modal checkout chrome
5. **ChromeGate**: confirm whether marketing Navbar should hide on `/patient/*` (recommended in plan D14) — verify against Stitch portal shell (portal likely has its own nav).

## Sign-off criteria

UI implementation may start only when:

- [ ] Design pack imported and reviewed against the matrix above  
- [ ] Gaps filed as content/design tickets (not engineering redesign)  
- [ ] `contracts/ui.md` gate satisfied  

Until then, implement domain, Prisma, and actions behind feature flags or without final styling.
