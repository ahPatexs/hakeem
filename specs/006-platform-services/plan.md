# Implementation Plan: Platform Services & Shared Infrastructure

**Branch**: `006-platform-services` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-platform-services/spec.md`

## Summary

Centralize Hakeem cross-cutting capabilities—notifications (in-app/email/SMS/push), payments & billing, AI, file storage & medical documents, video consultation, search, audit vs activity timeline, localization, feature flags & configuration—behind shared **ports/adapters**, **domain services**, and durable **background jobs**. Consumed by Public Website, Auth, Patient, Doctor, and Admin; **not** a new end-user portal. Extend existing Prisma models and `src/ports/*` / `src/adapters/*`; introduce job queue, webhook verification hardening, channel policies, and shared UI primitives aligned with **approved Stitch** designs (project `2408493713147971043`) — **do not redesign**. Stack: Next.js 15 App Router, TypeScript strict, Prisma + Neon, Server Actions, React Query (client islands), Tailwind + shadcn/ui, Zod, `next-intl`.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), Node.js 20 LTS

**Primary Dependencies**: Next.js 15 (App Router, RSC, Server Actions, Route Handlers), Prisma 6.x, Zod, Tailwind CSS, shadcn/ui, `next-intl`, `@tanstack/react-query`, existing `@/auth`, `@/ports`, `@/adapters`

**Storage**: Neon PostgreSQL via Prisma (jobs, webhook receipts, outbound messages, search projection); private object storage via `StoragePort` (local/stub → cloud adapter); no public buckets

**Testing**: Vitest (domain: channel policy, refund/idempotency, webhook verify, job retry/dead-letter, AI fail-closed, document ACL); Playwright smoke for shared upload/payment/notification UI; contract tests for ports

**Target Platform**: Vercel + Neon; evergreen browsers; Stitch SoT for shared UI surfaces

**Project Type**: Web application — shared infrastructure layer inside single Next.js monorepo app (no microservices split in v1)

**Performance Goals**: Sync user paths ≤10s fail-fast on dependency issues (spec); search eligibility freshness ≤5 min; webhook ACK fast (&lt;2s) with heavy work deferred; notification in-app create p95 &lt; 300ms

**Constraints**: Stitch SoT; EN/AR + RTL; SAR; single primary payment/AI/video providers; BAA gate for prod AI+PHI; fail-closed medical screening; append-only audit; no Platform Services portal; HIPAA-ready patterns

**Scale/Scope**: ~6 ports + adapters; job worker/cron; webhook routes; shared UI kit; migrate callers in modules 001–005 to shared facades

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template — **PASS by default**. Discipline: ports/adapters over scattered provider calls; reuse Auth audit + Admin settings/health; DB-backed jobs before external queue products; no speculative second app.

**Post-Phase 1 re-check**: New job/webhook/outbound-message entities, email/SMS/push ports, search projection, shared UI kit, and cron worker are required by clarified FR-029–FR-043 — justified. Stitch UI review documented in [ui-review.md](./ui-review.md) (MCP auth unavailable at plan time; local design packs + existing components used). **PASS**.

## Service Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│  Product modules (Public / Auth / Patient / Doctor / Admin)     │
│  Server Actions · Route Handlers · RSC                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ facades (src/lib/platform/*)
┌────────────────────────────▼────────────────────────────────────┐
│  Domain services (src/domain/platform/*)                          │
│  notifications · billing · ai-governance · documents · search     │
│  localization · flags · jobs · webhooks                           │
└───────────┬──────────────────────────────┬──────────────────────┘
            │                              │
   ┌────────▼────────┐            ┌────────▼────────┐
   │ Prisma / Neon   │            │ Ports           │
   │ (source of      │            │ payments, ai,   │
   │  truth + jobs)  │            │ storage, malware │
   └─────────────────┘            │ telemedicine,   │
                                  │ email, sms, push│
                                  └────────┬────────┘
                                           │
                                  ┌────────▼────────┐
                                  │ Adapters        │
                                  │ stub* / vendor  │
                                  └─────────────────┘

Background: Vercel Cron → claim BackgroundJob rows → execute → retry/DLQ
Inbound: /api/webhooks/{payments|…} → verify → idempotent apply → enqueue side effects
```

**Principles**:
- Product modules call **facades**, never vendor SDKs directly.
- Mutations that can fail transiently enqueue **BackgroundJob** (email/SMS/push, malware scan, search refresh, admin fan-out).
- Webhooks verify signature, record `WebhookReceipt`, apply state machine once per `providerEventId`.
- Authorization remains in Auth RBAC + relationship checks inside domain services.

## Folder Structure

### Documentation (this feature)

```text
specs/006-platform-services/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── ui-review.md
├── contracts/
│   ├── platform-services.md
│   └── ui.md
└── tasks.md                 # /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
src/
├── ports/
│   ├── payments.ts              # existing — extend refund/ping
│   ├── storage.ts               # existing — add signedUrl if needed
│   ├── telemedicine.ts          # existing — add ping
│   ├── ai-assistant.ts          # existing
│   ├── malware-scan.ts          # existing
│   ├── safety-check.ts          # existing
│   ├── email.ts                 # NEW
│   ├── sms.ts                   # NEW
│   └── push.ts                  # NEW
├── adapters/
│   ├── stub-payments.ts
│   ├── stub-ai.ts
│   ├── stub-telemedicine.ts
│   ├── stub-malware.ts
│   ├── stub-safety-check.ts
│   ├── local-storage.ts
│   ├── stub-email.ts            # NEW / wrap auth email
│   ├── stub-sms.ts              # NEW
│   ├── stub-push.ts             # NEW
│   └── index.ts                 # resolve adapters from env
├── domain/platform/
│   ├── notifications.ts         # channel matrix, PartialSuccess
│   ├── outbound.ts              # idempotent send keys
│   ├── billing.ts               # obligation transitions (shared)
│   ├── webhooks.ts              # verify + idempotent apply rules
│   ├── documents.ts             # ACL + screening fail-closed
│   ├── ai-governance.ts         # move/extend from domain/admin
│   ├── search.ts                # bookable eligibility + projection
│   ├── localization.ts          # locale resolve + fallback
│   ├── outcomes.ts              # shared result taxonomy
│   ├── retry.ts                 # backoff schedule
│   └── jobs.ts                  # claim/complete/fail/dead-letter
├── lib/platform/
│   ├── notifications.ts         # facade used by all modules
│   ├── email.ts
│   ├── sms.ts
│   ├── push.ts
│   ├── payments.ts
│   ├── billing.ts
│   ├── ai.ts
│   ├── storage.ts
│   ├── documents.ts
│   ├── video.ts
│   ├── search.ts
│   ├── audit.ts                 # thin wrap auth auditLog
│   ├── timeline.ts
│   ├── flags.ts
│   ├── settings.ts              # wrap PlatformSetting
│   ├── health.ts                # component pings for Admin
│   └── jobs.ts                  # enqueue helpers
├── actions/platform/            # optional shared server actions
│   └── upload.ts                # shared upload mutation if needed
├── app/api/
│   ├── webhooks/payments/route.ts   # harden + move from patient-only
│   ├── webhooks/video/route.ts      # optional
│   ├── cron/platform-jobs/route.ts  # Vercel Cron worker
│   └── platform/health/route.ts     # internal/ops optional
├── components/platform/         # shared UI kit (Stitch-aligned)
│   ├── dialogs/
│   ├── notifications/
│   ├── upload/
│   ├── payments/
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   ├── loading-state.tsx
│   └── index.ts
├── hooks/platform/              # shared client hooks
│   ├── use-notifications.ts
│   ├── use-upload.ts
│   └── use-payment-intent.ts
└── i18n/messages/               # shared keys under platform.*

prisma/
├── schema.prisma                # BackgroundJob, WebhookReceipt, OutboundMessage, SearchDoctorProjection, …
└── migrations/

tests/
├── unit/platform/
├── integration/platform/
└── e2e/platform/                # optional shared UI smokes
```

**Structure Decision**: Single Next.js app; platform layer under `ports` / `adapters` / `domain/platform` / `lib/platform` / `components/platform`. Migrate Patient/Doctor/Admin notification & payment call sites to facades without creating a separate deployable service.

## Shared Components (UI)

Promote/align (do **not** redesign) from existing portal shared kits + Stitch:

| Component | Role | Source of truth |
|-----------|------|-----------------|
| Confirm / reason dialogs | Destructive / reason ≥10 | Stitch dialogs; reuse `ConfirmReasonDialog` pattern → `components/platform/dialogs` |
| Notification list / badge | In-app center chrome | Stitch notification surfaces; unify patient/doctor/admin list primitives |
| Upload dropzone / progress | File + medical upload | Stitch upload; wrap `StoragePort` + scan PENDING state |
| Payment checkout / status | Intent + Paid/Failed | Stitch payment confirmation; client secret / redirect only |
| EmptyState | No data | Existing admin/patient empty → platform |
| ErrorState | Safe failure | Existing error-state → platform |
| Loading / ListSkeleton | Pending | Existing list-skeleton → platform |

Details: [ui-review.md](./ui-review.md), [contracts/ui.md](./contracts/ui.md).

## Shared Hooks

```text
hooks/platform/
├── use-notifications.ts     # React Query: unread count + list invalidate after mark-read
├── use-upload.ts            # progress, scanStatus polling while PENDING
└── use-payment-intent.ts    # client confirm UX; server creates intent via action
```

Server remains source of truth; hooks only for interactive islands.

## Shared Utilities

```text
domain/platform/outcomes.ts   # Success | PartialSuccess | ValidationError | …
domain/platform/retry.ts      # attempt → delayMs (exp backoff + jitter, max 5)
lib/platform/redact.ts        # strip secrets from operational logs
lib/platform/idempotency.ts   # hash keys for outbound / jobs
```

## API Contracts

See [contracts/platform-services.md](./contracts/platform-services.md):

- Facade function contracts (TypeScript) for notifications, email, payments, AI, documents, video, search, jobs
- HTTP: `POST /api/webhooks/payments`, `GET|POST /api/cron/platform-jobs` (cron secret)
- Outcome taxonomy and error codes

Prefer Server Actions for app mutations; Route Handlers for webhooks/cron/streams.

## Background Jobs & Queue Strategy

| Concern | Decision |
|---------|----------|
| Queue | **Postgres-backed** `BackgroundJob` table (Neon) |
| Claim | `FOR UPDATE SKIP LOCKED` (or Prisma interactive transaction equivalent) |
| Trigger | Vercel Cron every 1 min → `/api/cron/platform-jobs` + optional enqueue-time `waitUntil` best-effort |
| Idempotency | Unique `(type, idempotencyKey)` where key derived from business event |
| Retry | Exponential backoff + jitter; max **5** attempts; then `FAILED` / dead-letter |
| Visibility | Job state in DB; Admin health + `notifyAdmins` on DLQ for critical types |
| Types (v1) | `OUTBOUND_EMAIL`, `OUTBOUND_SMS`, `OUTBOUND_PUSH`, `MALWARE_SCAN`, `SEARCH_REFRESH_DOCTOR`, `WEBHOOK_SIDE_EFFECT`, `NOTIFY_ADMINS_FANOUT` |

**Rejected for v1**: Redis/BullMQ (ops complexity), always-inline sends (violates retry/partial channel isolation).

## Integration Strategy

| Capability | Port | v1 Adapter | Notes |
|------------|------|------------|-------|
| Payments | `PaymentsPort` | stub → primary vendor | Webhooks authoritative; refund optional |
| AI | `AiAssistantPort` | stub → primary vendor | Fail-closed via governance; BAA gate env |
| Storage | `StoragePort` | local → private cloud | Signed/short-lived download |
| Malware | `MalwareScanPort` | stub clean/reject | Fail-closed for medical |
| Video | `TelemedicinePort` | stub → primary vendor | Tokens time-bounded; recording off |
| Email | `EmailPort` | wrap existing `sendAuthEmail` / stub | Rate limits preserved |
| SMS | `SmsPort` | stub / disabled | Safe skip if unconfigured |
| Push | `PushPort` | stub / disabled | No-op when flag off |

Env selects adapters (`PLATFORM_*_ADAPTER` or existing env). Product code never branches on vendor names.

## Security Strategy

- AuthN/Z: existing sessions + `requirePermission` / relationship ACL in document/video/search
- CSRF: same-origin on cookie mutations (existing); webhooks use signature not cookies
- Webhooks: verify HMAC/shared secret; reject invalid; idempotent by `providerEventId`
- Secrets: Configuration Management references only; never UI-exposed
- PHI: minimize notification bodies; no media in audit; redact operational logs
- Storage: private objects; ≤15m download URLs; upload type/size limits (25 MB default)
- AI: global + per-user disable; prod PHI requires BAA flag
- Audit: append-only `SecurityAuditEvent` for high-impact platform mutations

## Monitoring Strategy

- Reuse Admin `SystemHealthSnapshot` + `runHealthChecks()`; extend component keys already present (`PAYMENTS`, `AI`, `TELEMEDICINE`, add email/SMS/storage as messages under checks or extend enum if needed)
- Port `ping()` / lightweight health URL where configured
- DLQ / failed jobs → Admin notification category `HEALTH` or `ADMIN_OPS`
- Operational logs: structured `console`/`logger` with correlation id; no APM product in v1
- Metrics light: job success/fail counts via SQL for health degraded thresholds

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Postgres job queue | Spec durable retries + DLQ without new infra | Inline-only sends break channel isolation & retries |
| New Email/SMS/Push ports | Spec channel matrix + Auth anti-enumeration | Keep ad-hoc `sendAuthEmail` only → duplication returns |
| Search projection table | 5-minute freshness + consistent public/patient | Live heavy joins only → slow + inconsistent filters |

## Phase Outputs

| Phase | Artifact |
|-------|----------|
| 0 | [research.md](./research.md) |
| 1 | [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md), [ui-review.md](./ui-review.md) |
| 2 | `tasks.md` via `/speckit-tasks` |
