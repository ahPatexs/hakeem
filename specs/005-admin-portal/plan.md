# Implementation Plan: Administration Portal & Platform Management

**Branch**: `005-admin-portal` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-admin-portal/spec.md`

## Summary

Build the authenticated **Administration Portal** in the existing Next.js 15 app: dashboard KPIs/quick actions, user lifecycle, doctor approvals, appointment oversight, AI operations/governance, billing & revenue, reports/analytics, platform settings, system health, audit logs, notifications/announcements, and role assignment—scoped strictly to Active `ADMIN` via Module 1 guards. Reuse Auth admin actions, `SecurityAuditEvent`, payments, appointments, AI tables; add platform settings, health snapshots, refunds, announcements, and expanded permissions. UI must match **approved Stitch** (project `2408493713147971043`) — **do not redesign**. Stack: App Router, TypeScript strict, Tailwind, shadcn/ui, React Query (client islands), Prisma + Neon, Zod, Server Actions.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), Node.js 20 LTS

**Primary Dependencies**: Next.js 15 (App Router, RSC, Server Actions, Route Handlers), Prisma 6.x, Zod, Tailwind CSS, shadcn/ui, `next-intl`, `@tanstack/react-query`, Module 1 `@/auth` (`requireRole` / `requirePermission` / `auditLog`)

**Storage**: Neon PostgreSQL via Prisma; no new object storage required for v1 admin (exports generated on demand)

**Testing**: Vitest (RBAC, last-admin, refund balance, doctor approve idempotency, settings audit), Playwright (admin journeys), authorization matrix (patient/doctor denial)

**Target Platform**: Vercel + Neon; evergreen browsers; Stitch desktop SoT with responsive adaptation

**Project Type**: Web application (extend single Next.js app)

**Performance Goals**: Dashboard usable ≤30s post-login (SC-001); KPI widgets ≤3s (SC-005); list p95 &lt; 500ms for page size 20; exports async-feel with row cap 10k

**Constraints**: Stitch SoT; ADMIN-only; idle 15m; audit ≥6y append-only; no clinical chart edit; no in-portal backup restore; EN/AR + RTL; HIPAA-ready architecture

**Scale/Scope**: ~15–20 admin routes × 2 locales; dashboard widget isolation; ops lists paginated at 20

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template — **PASS by default**. Discipline: single-app extension; reuse Module 1 auth + existing domain tables; Server Actions + Zod; expand permission strings without inventing a second RBAC engine; no speculative microservices.

**Post-Phase 1 re-check**: New `PlatformSetting`, health check records, refund/dispute fields, announcements, AI flag/review, analytics materialization helpers required by clarified spec — justified. Design pack export mandatory before pixel UI — justified. **PASS**.

## Route Structure

Locale-prefixed App Router under `src/app/[locale]/admin/`:

```text
/{locale}/admin                              # Admin Dashboard
/{locale}/admin/users                        # User Management
/{locale}/admin/users/[userId]               # User detail / lifecycle actions
/{locale}/admin/doctors                      # Doctor Management (+ pending queue)
/{locale}/admin/doctors/[userId]             # Doctor applicant / profile ops
/{locale}/admin/appointments                 # Appointment oversight
/{locale}/admin/appointments/[id]            # Ops detail / cancel-flag
/{locale}/admin/ai                           # AI Operations & governance
/{locale}/admin/billing                      # Billing & Transactions
/{locale}/admin/billing/[obligationId]       # Transaction detail / refund
/{locale}/admin/revenue                      # Payment & Revenue
/{locale}/admin/analytics                    # Reports & Analytics hub
/{locale}/admin/analytics/appointments
/{locale}/admin/analytics/revenue
/{locale}/admin/analytics/ai
/{locale}/admin/settings                     # Platform Settings
/{locale}/admin/health                       # System Health (tab or section)
/{locale}/admin/audit                        # Audit Logs (same Stitch surface as health)
/{locale}/admin/notifications                # Admin Notification Center
/{locale}/admin/notifications/announcements  # Publish (if Stitch) / omit if not
/{locale}/admin/roles                        # Role & Permission Management
/{locale}/account/change-password            # Module 1
/{locale}/account/sessions                   # Module 1
```

**Layouts**: Extend existing `admin/layout.tsx` (`RoleLayoutGate("ADMIN")`) with `AdminPortalShell` (sidebar + header per Stitch). Marketing chrome hidden via `PORTAL_SHELL_SEGMENTS` (ensure `admin` included).

**API Route Handlers** (prefer Server Actions; handlers only when needed):

```text
/api/admin/exports/audit                     # CSV stream (auth + CSRF + audit)
/api/admin/exports/analytics                 # CSV/PDF stream
/api/admin/health                            # Optional JSON health for widget refresh
```

## Folder Structure

```text
src/
├── app/[locale]/admin/              # Routes + layout
├── actions/admin/                    # Server Actions (Zod) — migrate/extend from actions/auth/admin.ts
│   ├── _helpers.ts                   # withAdmin / requireAdminPermission
│   ├── dashboard.ts
│   ├── users.ts
│   ├── doctors.ts
│   ├── appointments.ts
│   ├── ai-ops.ts
│   ├── billing.ts
│   ├── revenue.ts
│   ├── analytics.ts
│   ├── settings.ts
│   ├── health.ts
│   ├── audit.ts
│   ├── notifications.ts
│   ├── announcements.ts
│   └── roles.ts
├── components/admin/
│   ├── shell/                        # AdminPortalShell, AdminSidebar, AdminHeader
│   ├── dashboard/
│   ├── users/
│   ├── doctors/
│   ├── appointments/
│   ├── ai/
│   ├── billing/
│   ├── revenue/
│   ├── analytics/
│   ├── settings/
│   ├── health/
│   ├── audit/
│   ├── notifications/
│   ├── roles/
│   └── shared/                       # Empty/Error/Skeleton/Pagination/ConfirmDialog/StatusBadge/KpiCard
├── domain/admin/
│   ├── dashboard.ts                  # KPI aggregations + widget caps
│   ├── user-lifecycle.ts             # suspend/reinstate/deactivate/unlock/last-admin/self-block
│   ├── doctor-approval.ts            # approve/reject idempotent + public bookable side effects
│   ├── billing.ts                    # refund balance rules
│   ├── ai-governance.ts              # toggles + per-user disable + flag review
│   ├── settings.ts                   # maintenance + feature flags
│   ├── health.ts                     # component checks
│   ├── analytics.ts                  # period aggregations + export caps
│   └── audit.ts                      # query helpers (never mutate)
├── lib/admin/                        # loaders / mappers / export builders
├── auth/                             # extend Permission union + ROLE_PERMISSIONS for ADMIN

prisma/schema.prisma                  # extensions in data-model.md

specs/005-admin-portal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── ui-review.md
├── contracts/
└── design/                           # Stitch export target (mandatory before pixel UI)
```

**Structure Decision**: Single Next.js app; admin feature module mirroring patient/doctor boundaries (`admin/` routes, `actions/admin`, `components/admin`, `domain/admin`). Fold existing `src/actions/auth/admin.ts` into `actions/admin/*` with stable re-exports during migration.

## Admin Architecture

```text
AdminLayout
  RoleLayoutGate(ADMIN)          # Active ADMIN session; idle 15m (Auth)
  AdminPortalShell
    ├─ AdminSidebar              # Stitch nav
    └─ AdminHeader               # notifications bell, locale, profile/sign-out
         └─ children (RSC pages)

Page (RSC)
  ├─ parallel loaders via Promise.allSettled (dashboard widgets)
  ├─ mutations via Server Actions (Zod + requirePermission + auditLog)
  └─ client islands: filters, confirm dialogs, charts, React Query badge poll
```

**Canonical ops loops**:

```text
Dashboard → Pending Approvals → Approve/Reject Doctor
Dashboard → Suspend User → reason → sessions revoked
Dashboard → Analytics / Settings / AI Ops / Audit (quick actions)
Billing → Refund → reason → audit → notify payer
Settings → Maintenance ON → non-admin surfaces blocked
```

## Dashboard Widgets

| Widget | Source | Notes |
|--------|--------|-------|
| Total Patients | `User` count `role=PATIENT` | Active vs all — show Active primary; tooltip for total |
| Total Doctors | `User` count `role=DOCTOR` + `doctorApproval=APPROVED` | Separate pending count in approvals widget |
| Active Appointments | `Appointment` non-terminal | CONFIRMED, CHECKED_IN, IN_PROGRESS |
| Revenue Summary | Sum `PaymentObligation` PAID − refunds (period default 30d) | Link → `/admin/revenue` |
| AI Usage Metrics | Count AI messages / conversations (patient + doctor) in period | Link → `/admin/ai` |
| Platform Status | Latest `SystemHealthSnapshot` overall | Healthy \| Degraded \| Down |
| Pending Doctor Approvals | `doctorApproval=PENDING_APPROVAL` | Count + deep link |
| Recent Activities | Latest `SecurityAuditEvent` admin.* (≤10) | Link → `/admin/audit` |
| Notifications | Unread admin notifications (≤5 + badge) | Link → `/admin/notifications` |
| Quick Actions | Static Stitch actions | Approve Doctor, Suspend User, Analytics, Settings, AI Ops, Audit |

Widget isolation: `Promise.allSettled`; failed widget → `ErrorState` + retry; never blank page.

## Shared Components

| Component | Role |
|-----------|------|
| `AdminPortalShell` | Sidebar + header + main |
| `AdminSidebar` / `AdminNav` | Stitch IA |
| `AdminHeader` | Bell, locale, user menu |
| `KpiCard` | Dashboard metrics |
| `QuickActionsBar` | Dashboard shortcuts |
| `EmptyState` / `ErrorState` / `ListSkeleton` | Mandatory states |
| `Pagination` / `SearchFilterBar` | Lists (page size 20) |
| `StatusBadge` | Account / doctor approval / payment / health |
| `ConfirmReasonDialog` | Suspend, reject, refund, AI disable (min 10 chars) |
| `DataTable` | Users, doctors, transactions, audit |
| `HealthStatusPill` | Healthy/Degraded/Down |
| `ExportButton` | Triggers audited export download |

Prefer `components/portal/` only for primitives already shared (skeleton/empty); keep admin chrome separate to avoid IA bleed.

## RBAC Strategy

```text
middleware: cookie presence for /admin/*
admin/layout: RoleLayoutGate("ADMIN") + status ACTIVE
requireAdmin() / requirePermission("admin:…")
IdP claims never grant ADMIN
```

**Permission expansion** (all granted to Active `ADMIN` in v1):

| Permission | Used by |
|------------|---------|
| `admin:portal:access` | layout / shell |
| `admin:users:read` / `admin:users:write` | user lifecycle (existing) |
| `admin:doctors:provision` / `admin:doctors:approve` | doctor mgmt (existing) |
| `admin:appointments:read` / `admin:appointments:write` | ops cancel/flag |
| `admin:billing:read` / `admin:billing:refund` | billing |
| `admin:ai:ops` | AI governance |
| `admin:settings:write` | platform settings |
| `admin:health:read` | system health |
| `admin:audit:read` | audit + exports (existing) |
| `admin:analytics:read` | analytics/reports |
| `admin:notifications:write` | announcements |
| `admin:roles:write` | role assign / admin invite |

**Guardrails** (domain): last Active ADMIN cannot be demoted/suspended/deactivated; admin cannot suspend self; doctor approve/reject idempotent.

Roles UI in v1: view matrix + assign primary `User.role` + invite admin — not a custom role builder.

## Audit Strategy

- Reuse `SecurityAuditEvent` (append-only); **never UPDATE/DELETE** from admin UI.
- Emit on every sensitive mutation + admin access denial + export.
- Types: extend Auth set with `admin.appointment.cancel`, `admin.billing.refund`, `admin.billing.dispute`, `admin.settings.change`, `admin.ai.toggle`, `admin.ai.user_disable`, `admin.ai.flag_review`, `admin.announcement.publish`, `admin.export.*`, `admin.health.view` (optional), `admin.access.denied`.
- Retention product policy ≥6 years (DB retention job / infra; UI does not purge).
- List filters: actor, type, target, date range, outcome; paginate 20; export ≤10k rows audited as `admin.export.audit`.

## Reporting & Analytics Strategy

| Layer | Approach |
|-------|----------|
| Analytics (interactive) | RSC aggregations over Neon for period presets (Today, 7d, 30d, custom); charts as client islands |
| Reporting (export) | CSV primary; PDF optional if Stitch shows PDF — generate via route handler; cap 10k rows |
| Domains | Users, doctors (pending/approved), appointments by status, revenue gross/refunds/net, AI usage |
| Caching | Short TTL tagged cache (`admin-analytics`) for expensive aggregates OK **without PHI columns**; invalidate on refund/approve/settings |
| No | Ad-hoc SQL, BI warehouse, custom report builder |

## Performance Strategy

- Dashboard: parallel `allSettled` loaders; minimal `select`; indexes on `(role, status)`, `(doctorApproval)`, `(status, startAt)` appointments, `(status, createdAt)` payments, `(type, createdAt)` audit, `(recipientUserId, createdAt)` notifications.
- Lists: cursor or offset pagination page size 20.
- Avoid N+1: batch user display names for audit actor/target.
- Exports off critical path (stream response).
- Do not load full AI transcripts on AI Ops list — metadata first; detail on demand.

## Caching Strategy

| Data | Cache |
|------|-------|
| User/doctor PHI lists, audit rows, billing detail | **no-store**; private |
| Dashboard KPIs | Per-request RSC; `revalidatePath('/admin')` after mutations |
| Analytics aggregates (non-PHI counts/sums) | Optional `unstable_cache` / tagged ≤60s |
| Platform settings | Read-through with `revalidateTag('platform-settings')` on save (immediate product requirement) |
| System health | Fresh on load; manual refresh; optional 30s client poll for status pill only |
| Stitch static assets | Standard static/image pipeline |

## State Management

| Concern | Approach |
|---------|----------|
| Auth | Module 1 opaque session; read-only `auth()` in RSC |
| Lists / dashboard | RSC + Server Actions + `revalidatePath` |
| Filters | `searchParams` |
| Notification badge | React Query light poll under admin layout |
| Charts | Client components fed by server-fetched series |
| Forms | RHF + Zod client; server Zod for all mutations |
| Confirm destructive | `ConfirmReasonDialog` before Server Action |

## API Contracts

See [contracts/admin-api.md](./contracts/admin-api.md) and [contracts/ui.md](./contracts/ui.md).

## Prisma Models

See [data-model.md](./data-model.md) — extends Module 1–3 with platform settings, health snapshots, payment refund fields, AI flags, announcements, notification category extensions, permission strings (code-level).

## UI Review (Stitch)

See [ui-review.md](./ui-review.md). Stitch project **`2408493713147971043`** contains approved Admin screens. **Export design pack to `design/` before pixel implementation.** Missing Stitch coverage (roles screen, mobile variants, explicit error screens) documented as pre-implementation gaps — implement IA from spec + closest Stitch surfaces; do not invent a new visual language.

## Project Structure (tests)

```text
tests/
├── unit/admin/
├── integration/admin/
└── e2e/admin/
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Expand Permission union | Spec sensitive actions + future least-privilege | Single `admin:all` hides audit intent |
| PlatformSetting table | Runtime maintenance/AI toggles | Env-only flags require redeploy |
| Health snapshot model | Dashboard + System Health alignment | Ad-hoc ping in UI only (untestable) |
| Refund fields on PaymentObligation | Spec full/partial refund | Status-only REFUNDED loses partial balance |
| Separate `actions/admin` module | Size/clarity vs auth admin blob | Monolithic `auth/admin.ts` already growing |
