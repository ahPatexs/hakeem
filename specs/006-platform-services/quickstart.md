# Quickstart: Platform Services validation

**Feature**: `006-platform-services` | **Date**: 2026-07-30

Runnable checks after implementation. Details: [platform-services.md](./contracts/platform-services.md), [data-model.md](./data-model.md).

## Prerequisites

- Neon/Postgres; `DATABASE_URL` set
- Migrations including BackgroundJob / WebhookReceipt / OutboundMessage / SearchDoctorProjection (as implemented)
- Seeded Admin, Patient, Doctor; stub adapters default-on
- `CRON_SECRET` set for job worker
- Dev server: `npm run dev`

## Setup

```bash
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Optional: set `PAYMENTS_HEALTH_URL`, `AI_HEALTH_URL`, `TELEMEDICINE_HEALTH_URL` for real pings.
LiveKit: set `TELEMEDICINE_ADAPTER=livekit`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (never expose secrets to client).

## Validation scenarios

### 1. Notification channel isolation
1. Trigger an appointment/payment notice via product flow.
2. Confirm in-app `Notification` row for recipient.
3. Stop email adapter (or force failure) → in-app still created; outbound email job retries then FAILED; PartialSuccess path logged.
4. Arabic user → Arabic template/copy.

### 2. Email Auth path
1. Register or request password reset.
2. Confirm send goes through `EmailPort` / platform facade (not a one-off vendor call).
3. Rate-limit resend → RATE_LIMITED.

### 3. Payments + webhook idempotency
1. Create payment intent for an obligation (Patient).
2. POST valid signed webhook → obligation PAID once; notification enqueued.
3. Replay same `providerEventId` → 200, no double Paid / double charge side effects (`WebhookReceipt`).
4. Invalid signature → 400, no state change.
5. Signed but stale timestamp (beyond ≤5m skew) → 400, no state change (FR-045 / SC-019).

### 4. Refunds
1. As Admin, partial refund → PARTIALLY_REFUNDED; patient notified.
2. Remainder → REFUNDED; further refund rejected.

### 5. AI fail-closed
1. Disable global patient AI in Admin settings.
2. Patient AI chat → denied.
3. Re-enable; disable single user AI → that user denied only.

### 6. Medical upload security
1. Patient uploads PDF ≤25MB → scan PENDING then CLEAN/REJECTED via job.
2. Unrelated user cannot download.
3. Treating doctor / owner can get ≤15m download URL.
4. Rejected scan never appears as available.

### 7. Video Communication (LiveKit)
1. Confirmed telemedicine appointment → patient and assigned doctor get join credentials from `lib/platform/video` (JWT from LiveKit adapter).
2. Both portals render shared `components/platform/video/*` (waiting room, camera preview, device selector, participant grid, controls) — no portal-local LiveKit Server SDK.
3. Other user → FORBIDDEN + audit.
4. Cancelled appointment → refused.
5. Optional: enable recording flag → egress path; default remains off.
6. Admin can view call log / session analytics summaries (no media).
7. LiveKit webhook invalid signature or stale skew → no session state corruption.

### 8. Search freshness + public rate limit
1. Approve/suspend doctor.
2. Within 5 minutes (or after running cron jobs), Public/Patient search bookable membership matches.
3. Burst anonymous discovery requests → `RATE_LIMITED` / throttle without breaking a normal single-user browse (FR-046 / SC-020).

### 9. Background jobs
1. Call cron endpoint with secret: `POST /api/cron/platform-jobs`.
2. Queued OUTBOUND_* / MALWARE_SCAN / SEARCH_REFRESH process.
3. Force permanent failure → FAILED after 5 attempts; Admin health/notification for critical types.

### 10. Shared UI (no redesign)
1. Open notification centers, upload, payment, empty/error/loading on Patient/Doctor/Admin.
2. Confirm components import from `components/platform` and match Stitch screens listed in [ui-review.md](./ui-review.md) (Notification Center / All Caught Up / Secure Checkout / Payment Status / Documents).
3. No new palette or typography stack.

### 11. Localization
1. Switch EN ↔ AR on a shared surface; RTL for AR; SAR formatting consistent.

### 12. Health
1. Admin → System Health shows Payments/AI/Storage/Video (and email/SMS messages) reflecting adapter ping or skip.

## Expected outcomes

- Facades used by Auth/Patient/Doctor/Admin for listed concerns
- No public storage URLs
- Webhook replays safe
- Jobs durable across restart (row remains QUEUED/RUNNING correctly)
- Stitch SoT respected — no new visual language

## References

- [plan.md](./plan.md) · [research.md](./research.md) · [contracts/ui.md](./contracts/ui.md)
