# Research: Platform Services & Shared Infrastructure

**Date**: 2026-07-30 | **Plan**: [plan.md](./plan.md)

Mandated stack: Next.js 15, TypeScript strict, Prisma, Neon, Server Actions, React Query, Tailwind. Research maps clarified Module 5 spec onto existing `ports`/`adapters`, Auth email, Patient webhook, Admin health/settings, and portal UIs. Stitch project `2408493713147971043` is UI SoT where shared surfaces exist.

## D1. Monolith shared layer vs microservices

- **Decision**: Keep Platform Services inside the single Next.js app as `domain/platform` + `lib/platform` + ports/adapters.
- **Rationale**: Spec is shared infrastructure for one product; Vercel deploy already hosts portals; avoids distributed transaction pain in v1.
- **Alternatives considered**: Separate Nest/worker service (ops overhead); npm workspace package only (still need runtime host).

## D2. Ports & adapters expansion

- **Decision**: Extend existing payments/storage/telemedicine/AI/malware ports; add **EmailPort**, **SmsPort**, **PushPort**; central adapter resolver from env.
- **Rationale**: Spec single-provider boundaries + future swaps; codebase already uses this pattern.
- **Alternatives considered**: Direct vendor SDK in actions (duplicates); plugin marketplace (out of scope).

## D3. Queue strategy (Postgres jobs)

- **Decision**: `BackgroundJob` table + Vercel Cron claim worker with SKIP LOCKED; max 5 retries with exponential backoff + jitter; dead-letter + Admin notify.
- **Rationale**: Spec FR-041/043; Neon already present; no Redis required for v1 volume.
- **Alternatives considered**: BullMQ+Redis; Inngest/Trigger.dev; fire-and-forget `waitUntil` only (not durable across cold starts).

## D4. Notification channel matrix

- **Decision**: Domain policy table/config keyed by event type → channels; in-app always for account-bound; email required for Auth + high-severity; SMS/push optional; PartialSuccess per channel; idempotent outbound keys.
- **Rationale**: Clarified FR-029/030; matches existing `Notification` model + `PortalSettings` email toggles (transactional security not fully opt-out).
- **Alternatives considered**: User fully custom channel matrix including disabling security email (unsafe); email-only.

## D5. Payment webhooks as source of truth

- **Decision**: Harden `/api/webhooks/payments` as platform route; verify signature; `WebhookReceipt` unique on `providerEventId`; obligation state machine forward-only; side effects (notify) via jobs.
- **Rationale**: Spec FR-031/042; current patient webhook works but lacks receipt table / shared facade.
- **Alternatives considered**: Client-only confirm (fraud/race); polling provider only (latency).

## D6. AI governance location

- **Decision**: Canonical governance in `domain/platform/ai-governance` (or keep `domain/admin` and re-export from platform); all AI routes call shared `assertAiAllowed`.
- **Rationale**: Spec FR-011/032; Admin toggles already exist—platform owns the fail-closed gate.
- **Alternatives considered**: Duplicate checks per route (drift); middleware-only (misses route handlers).

## D7. File storage & medical security

- **Decision**: `StoragePort` private objects; medical docs via existing `PatientUpload` / `ClinicalDocument` + scan status; signed download ≤15m; fail-closed if scan pending/rejected; ACL by patient owner + treating doctor + admin policy.
- **Rationale**: Spec FR-033/034; models already present.
- **Alternatives considered**: Public CDN URLs (PHI leak); sync scan only (blocks UX hard without jobs).

## D8. Video provider

- **Decision**: Keep `TelemedicinePort`; enforce appointment party checks in `lib/platform/video` before `createJoinToken`; recording off; optional webhook later.
- **Rationale**: Spec FR-035; patient/doctor join buttons already stubbed.
- **Alternatives considered**: Embed vendor SDK in UI (authz bypass risk).

## D9. Search projection

- **Decision**: `SearchDoctorProjection` (or materialized fields on `Doctor`) refreshed by `SEARCH_REFRESH_DOCTOR` job on publish/approve/suspend; query-time bookable filter still applied.
- **Rationale**: Spec FR-037 / SC-016; consistent Public + Patient discovery.
- **Alternatives considered**: Elasticsearch day one; live unindexed filters only.

## D10. Localization

- **Decision**: Continue `next-intl` + `LocaleCode`; platform message namespace `platform.*`; default anonymous AR when Accept-Language prefers Arabic; timezone Asia/Riyadh for shared scheduling formatters.
- **Rationale**: Spec FR-036; portals already bilingual.
- **Alternatives considered**: Separate i18n service; more locales in v1.

## D11. Logging vs audit vs timeline

- **Decision**: Keep three streams: `SecurityAuditEvent` (compliance), timeline events (reuse notifications/care entities or lightweight `TimelineEvent` if needed), operational logs (redacted structured logs).
- **Rationale**: Spec FR-038; avoid conflating UX feed with audit.
- **Alternatives considered**: Single “events” table (compliance risk); ship logs to user UI (noise/PHI).

## D12. Monitoring

- **Decision**: Extend Admin health checks to ping Email/SMS/Storage/Payments/AI/Video adapters; surface job DLQ counts as Degraded.
- **Rationale**: Spec FR-039 / SC-018; Admin health already exists.
- **Alternatives considered**: Full Datadog/New Relic product inside app (out of v1).

## D13. Error / outcome taxonomy

- **Decision**: Shared `PlatformOutcome` union in `domain/platform/outcomes.ts` mapped by facades; PartialSuccess for multi-channel notify.
- **Rationale**: Spec FR-040; consistent portal messaging.
- **Alternatives considered**: Throw-only Error classes (harder PartialSuccess); HTTP codes only (Server Actions).

## D14. Shared UI kit

- **Decision**: Introduce `components/platform/*` by **moving/re-exporting** existing Empty/Error/Skeleton/ConfirmReasonDialog and aligning tokens to Stitch; portals import from platform over time.
- **Rationale**: Spec FR-002 + business goal de-duplication; do not redesign.
- **Alternatives considered**: Leave triplicated shared folders forever; new visual system (forbidden).

## D15. Stitch MCP availability

- **Decision**: UI review uses local design manifests (001/003/004/005) + component inventory; re-export screens when Stitch OAuth available.
- **Rationale**: Plan-time Stitch `list_screens` returned 401; must not block plan.
- **Alternatives considered**: Block plan on MCP (unnecessary); invent new UI (forbidden).

## Resolved Technical Context

| Item | Resolution |
|------|------------|
| Language | TypeScript strict |
| Framework | Next.js 15 App Router |
| ORM/DB | Prisma + Neon |
| Jobs | Postgres BackgroundJob + Cron |
| UI | Tailwind + shadcn + Stitch SoT |
| Client data | React Query islands only |
| Unknowns | None remaining for Phase 1 |
