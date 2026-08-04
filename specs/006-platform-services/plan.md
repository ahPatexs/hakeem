# Implementation Plan: Platform Services & Shared Infrastructure

**Branch**: `006-platform-services` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-platform-services/spec.md` (including FR-001–FR-048 clarifications).

## Summary

Centralize Hakeem cross-cutting capabilities—notifications (in-app/email/SMS/push), payments & billing, AI, file storage & medical documents, **Video Communication Service (LiveKit Cloud / WebRTC)**, search, audit vs activity timeline, localization, feature flags & configuration—behind shared **ports/adapters**, **domain services**, and durable **background jobs**. Consumed by Public Website, Auth, Patient Portal, Doctor Portal, and Administration Portal; **not** a new end-user portal. Patient and Doctor consume the shared video service; Admin monitors sessions/analytics; **no LiveKit business logic in portals**.

Extend existing Prisma models and `src/ports/*` / `src/adapters/*`; harden webhooks (signature + freshness skew), channel policies, TLS-only downloads, public search rate limits, and shared UI primitives aligned with **approved Stitch** designs (project `2408493713147971043`) — **do not redesign**.

**Technology stack (mandated)**: Next.js 15 App Router · TypeScript strict · Prisma ORM · Neon PostgreSQL · Server Actions · React Query (client islands) · Tailwind CSS (+ existing shadcn/ui, Zod, `next-intl`) · **LiveKit Cloud** · **LiveKit Server SDK** · **LiveKit React Components** · **WebRTC** (via LiveKit client).

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), Node.js 20 LTS

**Primary Dependencies**: Next.js 15 (App Router, RSC, Server Actions, Route Handlers), Prisma 6.x, Zod, Tailwind CSS, shadcn/ui, `next-intl`, `@tanstack/react-query`, **`livekit-server-sdk`**, **`@livekit/components-react`** (+ LiveKit client / WebRTC), existing `@/auth`, `@/ports`, `@/adapters`

**Storage**: Neon PostgreSQL via Prisma (jobs, webhook receipts, outbound messages, search projection, push devices); private object storage via `StoragePort` (local/stub → cloud adapter); no public buckets; HTTPS/TLS for provider and download paths (FR-044)

**Testing**: Vitest (channel policy, refund/idempotency, webhook verify+skew, job retry/DLQ, AI fail-closed, document ACL, search rate limit); Playwright smoke for shared upload/payment/notification UI; contract tests for ports

**Target Platform**: Vercel + Neon; evergreen browsers; Stitch SoT for shared UI surfaces

**Project Type**: Web application — shared infrastructure layer inside single Next.js app (no microservices split in v1)

**Performance Goals**: Sync user paths ≤10s fail-fast on dependency issues; search eligibility freshness ≤5 min; webhook ACK fast (&lt;2s) with heavy work deferred; notification in-app create p95 &lt; 300ms; public search abuse throttling without breaking normal browsing (FR-046 / SC-020)

**Constraints**: Stitch SoT; EN/AR + RTL; SAR; single primary payment/AI providers; **LiveKit Cloud as primary Video Communication provider**; BAA gate for prod AI+PHI; fail-closed medical screening; append-only audit; no Platform Services portal; webhook skew ≤5m when timestamp present (FR-045); ops logs ≥30d vs audit ≥365d (FR-047); **no LiveKit SDK / room / JWT business logic inside Patient or Doctor portals** — portals consume shared Video Communication Service only; recording optional/off-by-default

**Scale/Scope**: Ports + adapters; Postgres job worker/cron; webhook routes; shared UI kit under `components/platform` (including **shared video + AI** surfaces); callers in modules 001–005 use shared facades

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template — **PASS by default**. Discipline: ports/adapters over scattered provider calls; reuse Auth audit + Admin settings/health; DB-backed jobs before external queue products; no speculative second app; no UI redesign.

**Post-Phase 1 re-check**: Job/webhook/outbound/search/push entities, email/SMS/push ports, shared UI kit, cron worker, TLS/download policy, webhook skew, public search rate limit, ops-log retention (FR-029–FR-048), and **LiveKit-backed Video Communication Service** (centralized room/JWT/session UI; Patient/Doctor consume; Admin monitors) are required — justified. Stitch UI review includes video + AI shared surfaces in [ui-review.md](./ui-review.md). **PASS**.

## Service Architecture

Named shared services (all behind `src/lib/platform/*` facades; portals never call vendor SDKs):

| Service | Facade / domain | Consumers |
|---------|-----------------|-----------|
| Notification Service | `notifications` | All portals |
| Email Service | `email` | Auth + all portals |
| SMS Service | `sms` | Auth + care events |
| Push Notification Service | `push` | Patient/Doctor (when configured) |
| Payment Service | `payments` / `billing` | Patient + Admin |
| AI Service | `ai` + governance | Patient + Doctor; Admin toggles |
| File Storage Service | `storage` / `documents` | Patient + Doctor + Admin |
| **Video Communication Service (LiveKit)** | `video` + LiveKit adapter + shared video UI | **Patient + Doctor**; **Admin monitors** sessions/analytics |
| Search Service | `search` | Public + Patient (+ Admin lookups) |
| Localization Service | `localization` + `next-intl` | All surfaces |
| Audit Logging | `audit` | All high-impact mutations; Admin views |
| Activity Timeline | `timeline` | Patient + Doctor |

```text
┌──────────────────────────────────────────────────────────────────┐
│ Patient Portal │ Doctor Portal │ Admin Portal │ Auth │ Public     │
│  (consume facades + shared platform UI only — no LiveKit SDK)    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ src/lib/platform/*
┌────────────────────────────▼─────────────────────────────────────┐
│ Shared domain services                                             │
│ Notification · Email · SMS · Push · Payment/Billing · AI           │
│ File Storage/Documents · Video Communication · Search              │
│ Localization · Audit · Timeline · Flags · Jobs · Webhooks          │
└───────────┬──────────────────────────────┬───────────────────────┘
            │                              │
   ┌────────▼────────┐            ┌────────▼────────────────────────┐
   │ Prisma / Neon   │            │ Ports                           │
   │ sessions, jobs, │            │ payments, ai, storage, malware  │
   │ call logs,      │            │ telemedicine (LiveKit), email,  │
   │ analytics agg.  │            │ sms, push                       │
   └─────────────────┘            └────────┬────────────────────────┘
                                           │
                                  ┌────────▼────────┐
                                  │ Adapters        │
                                  │ stub* / LiveKit │
                                  │ Cloud / vendors │
                                  └─────────────────┘

Background: Vercel Cron → claim BackgroundJob → execute → retry/DLQ
Inbound: /api/webhooks/{payments|video} → verify sig + skew → idempotent apply → enqueue
Client islands: hooks/platform/* for notifications, upload, payment, **video session**
```

**Principles**:
- Product modules call **facades**, never vendor SDKs directly (**including LiveKit Server SDK and room APIs**).
- Patient and Doctor portals mount **shared** `components/platform/video/*` only; they supply appointment context + role, not LiveKit credentials logic.
- Administration Portal consumes **session analytics / call logging / health** from platform video — not a second LiveKit integration.
- Transient work enqueues **BackgroundJob** (email/SMS/push, malware scan, search refresh, webhook side effects, admin fan-out, optional recording finalize).
- Webhooks verify signature (+ timestamp skew when present), record `WebhookReceipt`, apply state machine once per `providerEventId`.
- Authorization remains in Auth RBAC + relationship checks inside domain services (video: appointment patient + assigned doctor only).
- Synchronous UX fails fast (≤10s) with `DEPENDENCY_UNAVAILABLE`; background retries continue where queued.

## Folder Structure

### Documentation (this feature)

```text
specs/006-platform-services/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── ui-review.md
├── design/manifest.json
├── contracts/
│   ├── platform-services.md
│   └── ui.md
└── tasks.md                 # /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
src/
├── ports/
│   ├── payments.ts
│   ├── storage.ts
│   ├── telemedicine.ts          # LiveKit-capable port (room, JWT, recording hooks)
│   ├── ai-assistant.ts
│   ├── malware-scan.ts
│   ├── safety-check.ts
│   ├── email.ts
│   ├── sms.ts
│   └── push.ts
├── adapters/
│   ├── stub-*.ts / local-storage.ts / vendor adapters
│   ├── livekit-telemedicine.ts  # LiveKit Cloud: rooms, AccessToken JWT, optional egress
│   └── index.ts                 # resolve adapters from env (TELEMEDICINE_ADAPTER=livekit|stub)
├── domain/platform/
│   ├── notifications.ts         # channel matrix, PartialSuccess
│   ├── outbound.ts              # idempotent send keys
│   ├── billing.ts               # obligation transitions
│   ├── webhooks.ts              # verify + skew + idempotent apply
│   ├── documents.ts             # ACL + screening fail-closed
│   ├── ai-governance.ts
│   ├── search.ts                # bookable eligibility + rate limit
│   ├── video.ts                 # session lifecycle, waiting room policy, call log rules
│   ├── localization.ts
│   ├── outcomes.ts
│   ├── retry.ts                 # backoff + non-retryable set
│   └── jobs.ts                  # claim/complete/fail/dead-letter + concurrency
├── lib/platform/
│   ├── notifications.ts | email.ts | sms.ts | push.ts
│   ├── payments.ts | billing.ts | ai.ts
│   ├── storage.ts | documents.ts | video.ts | search.ts
│   ├── audit.ts | timeline.ts | flags.ts | settings.ts
│   ├── health.ts | jobs.ts | redact.ts | idempotency.ts
├── actions/platform/            # shared server actions (incl. video token/session)
├── app/api/
│   ├── webhooks/payments/route.ts
│   ├── webhooks/video/route.ts  # LiveKit webhooks (room/egress events)
│   ├── cron/platform-jobs/route.ts
│   └── platform/…               # file download / health as needed
├── components/platform/         # shared UI kit (Stitch-aligned) — DO NOT REDESIGN
│   ├── dialogs/confirm-reason-dialog.tsx
│   ├── notifications/notification-list.tsx
│   ├── upload/file-upload-field.tsx
│   ├── payments/payment-status-badge.tsx
│   ├── ai/                      # shared AI chrome (chat shell / disclaimer) — Stitch-aligned
│   ├── video/                   # LiveKit React Components wrapped; shared by Patient+Doctor
│   │   ├── waiting-room.tsx
│   │   ├── camera-preview.tsx
│   │   ├── device-selector.tsx
│   │   ├── participant-grid.tsx
│   │   ├── call-controls.tsx    # audio/video/screen-share/chat toggles
│   │   └── session-shell.tsx    # Room connect + recovery UI
│   ├── empty-state.tsx | error-state.tsx | loading-state.tsx
│   └── index.ts
├── hooks/platform/
│   ├── use-notifications.ts
│   ├── use-upload.ts
│   ├── use-payment-intent.ts
│   └── use-video-session.ts     # token fetch + reconnect signals (no LiveKit secrets in portals)
└── i18n/messages/               # platform.* keys (incl. platform.video.*)

prisma/                          # BackgroundJob, WebhookReceipt, OutboundMessage,
                                 # SearchDoctorProjection, PushDeviceRegistration,
                                 # VideoSession / VideoCallEvent (call logging + analytics) …
tests/unit|integration|e2e/platform/
```

**Structure Decision**: Single Next.js app; platform layer under `ports` / `adapters` / `domain/platform` / `lib/platform` / `components/platform` / `hooks/platform`. No separate deployable microservice in v1.

## Shared Components

Promote/align (do **not** redesign) from existing portal kits + Stitch screens (see [ui-review.md](./ui-review.md)):

| Component | Role | Stitch / code SoT |
|-----------|------|-------------------|
| Confirm / reason dialogs | Destructive / reason ≥10 | Existing ConfirmReasonDialog → `components/platform/dialogs` |
| Notification list / badge / empty | In-app center | Stitch: Notification Center, Details, All Caught Up |
| Upload field | File + medical upload + PENDING scan | Stitch: Prescriptions & Documents / Lab & Radiology patterns |
| Payment badge / checkout shell | Intent + Paid/Failed | Stitch: Secure Checkout, Payment Status, Payment Successful |
| EmptyState | No data | Existing tokens → platform |
| ErrorState | Safe failure / access denied messaging | Existing + Auth Access Denied patterns |
| LoadingState / ListSkeleton | Pending | Existing skeletons → platform |
| **Shared video waiting room** | Pre-join lobby | Stitch: Waiting Room - Hakeem Video Consultation |
| **Camera preview** | Local media preview before join | Shared `components/platform/video/camera-preview` (LiveKit/WebRTC) |
| **Device selector** | Mic/camera/speaker picker | Shared `device-selector` |
| **Participant grid** | Remote/local tiles | Shared `participant-grid` (LiveKit React Components) |
| **Call controls** | Mute, camera, screen share, in-call chat | Shared `call-controls` |
| **Shared AI chrome** | Assistant shell / disclaimer | Stitch AI Consultation / Prescription surfaces — `components/platform/ai` |

Contract: [contracts/ui.md](./contracts/ui.md). Video UI details: [ui-review.md](./ui-review.md).

## Shared Hooks

```text
hooks/platform/
├── use-notifications.ts     # React Query: unread + list; invalidate after mark-read
├── use-upload.ts            # progress; poll scanStatus while PENDING
├── use-payment-intent.ts    # client confirm UX; Server Action creates intent
└── use-video-session.ts     # requests join credentials via Server Action; exposes
                             # connection/reconnect state; never holds API keys
```

Server remains source of truth; React Query / LiveKit React Components only on interactive client islands. Portals pass `appointmentId` + role; platform returns short-lived JWT + room URL.

## Shared Utilities

```text
domain/platform/outcomes.ts   # Success | PartialSuccess | ValidationError | …
domain/platform/retry.ts      # attempt → delayMs; non-retryable set (FR-041)
lib/platform/redact.ts        # strip secrets from operational logs
lib/platform/idempotency.ts   # hash keys for outbound / jobs
```

## API Contracts

See [contracts/platform-services.md](./contracts/platform-services.md):

- Facade contracts for notifications, email/SMS/push, payments, AI, documents, video, search, jobs
- HTTP: `POST /api/webhooks/payments` (sig + skew), `POST /api/webhooks/video`, `GET|POST /api/cron/platform-jobs`
- Outcome taxonomy; idempotency keys; public search `RATE_LIMITED`

Prefer **Server Actions** for app mutations; **Route Handlers** for webhooks/cron/streams/downloads.

## Background Jobs & Queue Strategy

| Concern | Decision |
|---------|----------|
| Queue | **Postgres-backed** `BackgroundJob` on Neon |
| Claim | `FOR UPDATE SKIP LOCKED` (or Prisma interactive transaction equivalent) |
| Trigger | Vercel Cron → `/api/cron/platform-jobs` (+ optional enqueue-time `waitUntil` best-effort) |
| Idempotency | Unique `(type, idempotencyKey)` |
| Retry | Exponential backoff + jitter; max **5**; then `FAILED` / dead-letter |
| Concurrency | Per-type soft bound (FR-048) to protect providers |
| Visibility | Job state in DB; Admin health + `notifyAdmins` on DLQ for critical types |
| Types (v1) | `OUTBOUND_EMAIL`, `OUTBOUND_SMS`, `OUTBOUND_PUSH`, `MALWARE_SCAN`, `SEARCH_REFRESH_DOCTOR`, `WEBHOOK_SIDE_EFFECT`, `NOTIFY_ADMINS_FANOUT`, optional `VIDEO_RECORDING_FINALIZE` |

**Rejected for v1**: Redis/BullMQ; always-inline sends (breaks retry/channel isolation).

## Video Communication Service (LiveKit) — extension

Complete shared telemedicine capability used by **Patient Portal** and **Doctor Portal**. **Administration Portal** monitors sessions, health, call logs, and analytics summaries. **All LiveKit business logic lives in Platform Services** (`ports/telemedicine`, `adapters/livekit-telemedicine`, `domain/platform/video`, `lib/platform/video`, `components/platform/video`, `hooks/platform/use-video-session`). Portals must not import `livekit-server-sdk` or mint tokens.

### Stack binding

| Layer | Choice |
|-------|--------|
| Media plane | WebRTC via LiveKit |
| Cloud | LiveKit Cloud (API key/secret in secure config) |
| Server | `livekit-server-sdk` — room create/delete, AccessToken JWT, optional egress |
| Client UI | `@livekit/components-react` wrapped in Stitch-aligned `components/platform/video/*` |
| Adapter switch | `TELEMEDICINE_ADAPTER=livekit` (prod) \| `stub` (local/tests) |

### Capability map

| Capability | Platform ownership | Notes |
|------------|-------------------|--------|
| LiveKit Integration | `adapters/livekit-telemedicine.ts` | Only adapter talks to LiveKit Cloud APIs |
| Room Management | Port `createRoom` / `closeRoom` + domain session | 1:1 with telemedicine appointment; room name derived from appointment id |
| JWT Token Generation | Server-only via facade `getJoinCredentials` | Time-bounded (≤2h or appointment end + ≤30m grace); role grants (publish/subscribe) |
| Session Management | `domain/platform/video` + `VideoSession` entity | States: SCHEDULED → WAITING → IN_CALL → ENDED \| CANCELLED |
| Waiting Room | Shared UI + optional LiveKit lobby metadata | Authz before token; Stitch Waiting Room SoT |
| Audio Controls | Shared `call-controls` | Mute/unmute via LiveKit tracks |
| Video Controls | Shared `call-controls` | Camera on/off |
| Screen Sharing | Shared `call-controls` | Optional publish screen track |
| In-call Chat | Shared data-channel / LiveKit chat UI wrapper | Ephemeral; not a substitute for clinical notes; no PHI dump to audit |
| Device Management | Shared `device-selector` + `camera-preview` | Enumerate devices before join |
| Participant Management | Domain roster + LiveKit participants | Only appointment patient + assigned doctor; deny others (audited) |
| Connection Recovery | Shared `session-shell` | Reconnect/backoff UX; re-fetch JWT if expired while still authorized |
| Recording Support | **Optional**, off by default (FR-035) | Feature flag + LiveKit egress; finalize via background job; media never in audit |
| Session Analytics | Aggregates for Admin (duration, join counts, disconnects) | No media content; summary metrics only |
| Call Logging | `VideoCallEvent` append-only operational events | join/leave/deny/reconnect/recording start-stop; Admin-visible |

### Consumer rules

```text
Patient Portal  →  lib/platform/video + components/platform/video  (join as patient)
Doctor Portal   →  lib/platform/video + components/platform/video  (join as doctor)
Admin Portal    →  lib/platform/video analytics/logs + health ping  (monitor only)
```

Forbidden in portals: LiveKit API keys, AccessToken minting, room create/delete, egress start/stop, webhook signature verify.

### Security (video-specific)

- JWT minted only after appointment relationship check + appointment not cancelled/ended.
- LiveKit API key/secret never shipped to client; only short-lived participant tokens.
- Webhook `/api/webhooks/video`: verify LiveKit signature + skew; idempotent event ids; update session/analytics via jobs when heavy.
- Recording off by default; enable only via PlatformSetting/feature flag + ops policy.
- Call logs exclude media payloads and full chat bodies in operational/audit streams (redact).

## Integration Strategy

| Capability | Port | v1 Adapter | Notes |
|------------|------|------------|-------|
| Payments | `PaymentsPort` | stub → primary vendor | Webhooks authoritative; 3DS via Patient UX; refund optional |
| AI | `AiAssistantPort` | stub → primary vendor | Fail-closed; BAA gate env; minimize raw PHI in prompts |
| Storage | `StoragePort` | local → private cloud | TLS; signed/short-lived download ≤15m |
| Malware | `MalwareScanPort` | stub clean/reject | Fail-closed for medical |
| **Video** | `TelemedicinePort` | **stub → LiveKit Cloud** | Rooms, JWT, waiting room, controls via shared UI; recording optional/off |
| Email | `EmailPort` | wrap Auth / stub | Rate limits preserved |
| SMS | `SmsPort` | stub / disabled | Skip if unverified phone / unconfigured |
| Push | `PushPort` | stub / disabled | No-op when flag off |

Env selects adapters. Product code never branches on vendor brand names (except adapter factory).

## Security Strategy

- AuthN/Z: sessions + `requirePermission` / relationship ACL (documents, video, search)
- Transport: HTTPS/TLS for provider calls and download URLs; no public buckets / permanent unsigned URLs (FR-044)
- **Video**: LiveKit secrets server-only; participant JWT short-lived; portals never mint tokens; media not in audit; recording gated
- Webhooks: HMAC/shared secret; reject invalid; **timestamp skew ≤5 minutes** when present (FR-045); idempotent by `providerEventId`
- Secrets: Configuration Management references only; never UI-exposed
- PHI: minimize notification bodies; no media in audit; redact operational logs; AI prompt minimization
- Storage: private objects; ≤15m download URLs; upload type/size limits (25 MB default); fail-closed screening
- AI: global + per-user disable; prod PHI requires BAA flag
- Search: abuse rate limit on public/anonymous discovery (FR-046)
- Audit: append-only for high-impact platform mutations (incl. video join denials)
- Retention: operational diagnostics ≥30d; security audit ≥365d floor (FR-047)

## Monitoring Strategy

- Admin `SystemHealthSnapshot` / `runHealthChecks()` for Email, SMS, Payments, AI, Storage, **Video/LiveKit** (Healthy | Degraded | Down)
- Port `ping()` / LiveKit Cloud health when configured
- **Video session analytics + call logs** surfaced to Administration (counts, durations, disconnect rates — no media)
- DLQ / failed jobs → Admin notification (`HEALTH` / ops)
- Operational logs: structured, correlation id, redacted; no full APM product in v1
- Light metrics: job success/fail counts via SQL for Degraded thresholds
- Forced dependency failure visible within one Admin health refresh (SC-018)

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Postgres job queue | Spec durable retries + DLQ without new infra | Inline-only sends break channel isolation & retries |
| New Email/SMS/Push ports | Spec channel matrix + Auth anti-enumeration | Ad-hoc sends → duplication returns |
| Search projection table | 5-minute freshness + consistent public/patient | Live heavy joins only → slow + inconsistent |
| LiveKit Cloud + shared video UI kit | Full Video Communication Service for Patient+Doctor; Admin monitoring; centralize WebRTC | Embed LiveKit in each portal → duplicated JWT/room logic and authz drift |

## Phase Outputs

| Phase | Artifact |
|-------|----------|
| 0 | [research.md](./research.md) (incl. LiveKit decision D8 update) |
| 1 | [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md), [ui-review.md](./ui-review.md) — video/AI UI extended |
| 2 | `tasks.md` via `/speckit-tasks` |
