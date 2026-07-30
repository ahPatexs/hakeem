# UI Review: Administration Portal (Stitch)

**Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Directive**: Review approved Stitch MCP design only. Do **not** generate a new UI.

## Review status

| Check | Result | Notes |
|-------|--------|-------|
| Stitch MCP access | **OK** | Project `2408493713147971043` |
| Design export in repo | **PARTIAL** | `d-admin-dashboard.png` + manifest; re-export remaining screens for full pixel QA |
| Pixel validation vs Stitch | **IN PROGRESS** | Shell/dashboard implemented against Hakeem tokens + Stitch IA |
| New UI generation | **NOT DONE** | No alternate design invented |


## Screens validated (inventory)

| Screen | Stitch id | Spec area | Notes |
|--------|-----------|-----------|-------|
| Admin Dashboard - Hakeem Platform Control | `2021a1fce3214dcdb7166930e4dc2c7b` | Dashboard | Desktop 2560×2856; KPI + ops chrome present |
| User Management - Hakeem Admin | `dbb65fd3ed5d472a86eefdb9d6e6f750` | Users | Desktop |
| Doctor Management - Hakeem Admin | `957069ed6b0a45af9b7d654be61eae82` | Doctors | Desktop |
| AI Operations & Platform Health - Hakeem Admin | `ad8436f648ed41f18b5c8588249372c5` | AI Ops (+ health cues) | Combined title with health |
| Billing & Transactions - Hakeem | `58eef7a7942a42e1badc0691b45c7a8f` | Billing | Desktop |
| Payment & Revenue Management - Hakeem Admin | `3a2b410376554f0782356d493a8b1b9b` | Revenue | Desktop |
| Platform Settings - Hakeem Admin | `6fe9b62f9d6d49f2a1852e475558f326` | Settings | Desktop |
| System Health & Audit Logs - Hakeem Admin | `d428b14b7f044ff5a71f1e6590733fe3` | Health + Audit | **Combined** single surface |
| Notification Center / Details / All Caught Up / Preferences | `58b227…`, `bc1f73…`, `f9cd86…`, `d9ea3c…` | Notifications | Empty state exists (**All Caught Up**) |
| Executive / Appointment / Revenue / AI Analytics | `337220…`, `be57c8…`, `2d767e…`, `52d7fb…` | Reports & Analytics | Analytics suite = reporting UI |
| Appointment Management / Dashboard | `664099…` (+ related) | Appointments | Shared Hakeem appointment visuals |

## Validation checklist (design quality)

| Criterion | Result | Notes |
|-----------|--------|-------|
| Responsive Design | **GAP** | Approved admin screens are **DESKTOP-only (2560)**. No mobile/tablet Stitch variants found for Admin. Implementation must responsively adapt (drawer nav, stacked KPIs) without redesigning. |
| Accessibility | **PARTIAL** | Cannot fully verify contrast/focus from screenshots alone. Plan requires WCAG 2.2 AA on primary flows; labeled icon buttons; keyboard for suspend/approve. |
| Loading States | **GAP** | No dedicated “loading” Admin Stitch screens located. Use skeleton patterns consistent with shell density (same approach as patient/doctor portals). |
| Empty States | **PARTIAL** | Notifications **All Caught Up** is explicit. Other lists: implement EmptyState matching Stitch empty affordances when present in HTML; otherwise reuse portal empty pattern without new visual language. |
| Error States | **GAP** | No dedicated admin error screens in Stitch titles. Use safe inline ErrorState + retry; do not invent illustrated error marketing pages. |
| Component Reusability | **OK** | Shared shell, KPI cards, tables, badges, confirm dialogs across Admin screens; keep under `components/admin/shared`. |
| Design Consistency | **OK** | Admin screens share Hakeem medical green/navy language with other modules in the same Stitch project. |

## Missing requirements before implementation

Documented gaps that must be resolved or explicitly accepted during implement:

1. **Design pack not in repo** — Export screenshots (+ HTML if available) for all Admin rows above into `specs/005-admin-portal/design/` and update `manifest.json` before pixel QA (SC-009).
2. **No Stitch screen titled “Role & Permission Management”** — Implement `/admin/roles` by adapting User Management / Platform Settings chrome; do not invent a new visual system. Confirm with product if a Stitch screen is added later.
3. **System Health and Audit Logs are one Stitch surface** — Use tabs or split routes that still match the combined composition; avoid two unrelated layouts.
4. **AI Operations screen title includes Platform Health** — Prefer `/admin/ai` as primary map; cross-link `/admin/health` so dashboard Platform Status stays single-sourced.
5. **Reports vs Analytics naming** — Spec “Reports & Analytics” maps to Stitch Analytics suite (Executive / Appointment / Revenue / AI); no separate “Reports” title — use Analytics hub + Export.
6. **Mobile Admin Stitch missing** — Accept responsive adaptation of desktop SoT; document QA on mobile viewports even without mobile PNGs.
7. **Loading / Error state art missing** — Accept skeleton + inline error components; block inventing new empty-marketing illustrations.
8. **Announcement compose UI** — Not clearly titled in Stitch; if absent after HTML review, ship inbound notifications only (per spec FR-033) and skip publish UI.
9. **Existing stub admin pages** (`/admin`, `/admin/users`, `/admin/doctors`) use interim Auth chrome — Replace with Stitch shell; do not keep the marketing-margin layout as final.

## Gate

| Workstream | Gate |
|------------|------|
| Domain / API / Prisma / RBAC | **Unblocked** — proceed via `/speckit-tasks` → implement |
| Pixel-perfect UI | **Blocked** until `design/` export complete |
| Responsive/a11y QA | **Required** at implement even without mobile Stitch |

**Summary**: Stitch Admin coverage exists for Dashboard, Users, Doctors, AI Ops, Billing, Revenue, Analytics, Settings, combined Health/Audit, and Notifications. Do not redesign. Export assets, then implement to match. Treat Roles, mobile, loading/error art, and announcements as documented gaps with specified fallbacks.
