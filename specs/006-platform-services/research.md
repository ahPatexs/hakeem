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

## D8. Video provider (LiveKit Communication Service)

- **Decision**: Primary video provider is **LiveKit Cloud** behind `TelemedicinePort` + `adapters/livekit-telemedicine.ts`. Shared Video Communication Service owns room management, JWT AccessToken minting, session lifecycle, waiting room, media controls (audio/video/screen share), in-call chat wrapper, device management, participant authz, connection recovery, optional recording (egress, off by default), session analytics, and call logging. Patient and Doctor portals **only** consume `lib/platform/video` + `components/platform/video/*` + `use-video-session`; Admin monitors health/analytics/call logs. **No LiveKit Server SDK or token logic in portals.** Client media uses LiveKit React Components / WebRTC.
- **Rationale**: Spec FR-016/017/035 + product requirement for a complete shared telemedicine stack spanning Patient/Doctor with Admin observability; centralization prevents duplicated JWT/room logic.
- **Alternatives considered**: Keep stub-only forever (insufficient for production telemedicine); embed LiveKit in each portal (forbidden duplication); Twilio/Agora as primary (rejected — LiveKit mandated for this plan extension).

## D8b. Video recording & analytics

- **Decision**: Recording remains **optional / off by default** via feature flag; when enabled, LiveKit egress + `VIDEO_RECORDING_FINALIZE` job; media never in audit. Analytics are aggregate counters (duration, joins, disconnects) for Admin — not a full APM product.
- **Rationale**: Aligns FR-035 with expanded capability list without forcing recording vault in v1.
- **Alternatives considered**: Always-on recording (privacy/compliance risk); no Admin visibility (ops blind spot).

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

- **Decision**: Stitch project `2408493713147971043` is SoT; live `list_screens` used for UI review mapping. PNG export into `design/` remains optional follow-up when implement needs pixel QA; code consolidates under `components/platform` without redesign.
- **Rationale**: MCP auth restored; shared surfaces exist as Notification Center/Details/All Caught Up, Secure Checkout / Payment Status / Successful, Prescriptions & Documents, Access Denied patterns.
- **Alternatives considered**: Block plan on PNG export (unnecessary); invent new UI (forbidden).

## D16. Transport & download security (FR-044)

- **Decision**: All provider and download paths HTTPS/TLS; no public ACLs; short-lived signed URLs or authenticated streams only.
- **Rationale**: Clarified medical/file security + enterprise residual pass.
- **Alternatives considered**: Public CDN with token query only (leak risk).

## D17. Webhook freshness skew (FR-045)

- **Decision**: When provider signs a timestamp, reject outside ≤5 minutes skew in addition to signature + event-id idempotency.
- **Rationale**: Reduces replay risk; SC-019.
- **Alternatives considered**: Event-id only (weaker against delayed replays of unused ids).

## D18. Public search rate limit (FR-046)

- **Decision**: Rate-limit anonymous/public doctor discovery; return `RATE_LIMITED`; keep query-time bookable checks.
- **Rationale**: Abuse/scraping protection without blocking normal browsing (SC-020).
- **Alternatives considered**: CAPTCHA day-one; no limit.

## D19. Operational log retention (FR-047)

- **Decision**: Ops diagnostics ≥30 days accessible; security audit ≥365 days floor — distinct streams.
- **Rationale**: Spec residual clarify; avoid conflating compliance and diagnostics retention.
- **Alternatives considered**: Single retention for all logs.

## D20. Job concurrency bounds (FR-048)

- **Decision**: Soft per-type concurrency on claim worker so provider rate limits are respected; DLQ after max attempts unchanged.
- **Rationale**: Prevents thundering herds on cron ticks.
- **Alternatives considered**: Unlimited parallel claim; external queue concurrency only.

## Resolved Technical Context

| Item | Resolution |
|------|------------|
| Language | TypeScript strict |
| Framework | Next.js 15 App Router |
| ORM/DB | Prisma + Neon |
| Jobs | Postgres BackgroundJob + Cron + per-type concurrency |
| UI | Tailwind + shadcn + Stitch SoT (no redesign); shared video + AI kit |
| Client data | React Query islands + LiveKit React Components for video |
| Video | LiveKit Cloud + Server SDK + WebRTC; centralized Video Communication Service |
| Webhooks | Signature + optional ≤5m skew + idempotent event id |
| Transport | TLS/HTTPS; private storage |
| Search | Projection + query-time bookable + public rate limit |
| Unknowns | None remaining for Phase 1 |
