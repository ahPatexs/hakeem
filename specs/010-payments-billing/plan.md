# Implementation Plan: Payments & Billing

**Branch**: `010-payments-billing` | **Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-payments-billing/spec.md` (FR-001–FR-033, non-interactive clarifications 2026-08-18).

## Summary

Complete Hakeem’s **product** financial lifecycle—checkout, invoices, receipts, refund requests, doctor earnings, admin finance, appointment-payment consistency—**on top of Module 5’s shared Payment Service**. The billing domain never contains provider SDKs. Replacing the PSP is an adapter swap (`PAYMENT_PROVIDER`) plus `PaymentsPort` compliance.

**Do not redesign UI.** Approved Stitch project `2408493713147971043` is visual SoT; existing Patient/Doctor/Admin shells stay. See [ui-review.md](./ui-review.md).

**Technology stack (mandated)**: Next.js 15 App Router · TypeScript strict · Prisma ORM · Neon PostgreSQL · Server Actions · React Query · Zod · Module 5 Payment Service / `PaymentsPort`.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), Node.js 20 LTS

**Primary Dependencies**: Next.js 15 (App Router, RSC, Server Actions, Route Handlers), Prisma 6.x, Zod, `@tanstack/react-query`, `next-intl`, existing `@/ports/payments`, `@/lib/platform/payments`, `@/adapters`

**Storage**: Neon PostgreSQL via Prisma (`PaymentObligation`, attempts, refunds, refund requests, invoice sequences, `WebhookReceipt`, `BackgroundJob`, `SecurityAuditEvent`)

**Testing**: Vitest (state machine, idempotency, refund eligibility, invoice uniqueness, reconcile, rate limit); existing webhook/refund integration tests extended; Playwright smoke for checkout/history/admin billing if already in suite

**Target Platform**: Vercel + Neon; evergreen browsers; Stitch SoT

**Project Type**: Web application — product module inside the single Next.js app (no new microservice)

**Performance Goals**: Sync pay path fail-fast ≤10s without marking Failed on timeout; webhook ACK fast (&lt;2s); receipt view &lt;3s; admin list paged (default 20)

**Constraints**: Stitch SoT; EN/AR + RTL; SAR only; one primary PSP behind Module 5; no PAN/CVV in Hakeem; webhook skew ≤5m; Processing timeout stays in-flight; 5 Failed attempts/hour; financial audit ≥6 years; no UI redesign; no doctor payouts; no tax engine

**Scale/Scope**: Extend existing payment tables + 3 new models; Patient/Doctor/Admin surfaces; one webhook route; reconcile job; doctor `/earnings` page

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template — **PASS by default**. Discipline: ports/adapters over portal vendor calls; reuse Module 5 payments/webhooks/jobs/audit; no second app; no UI redesign; no card vault.

**Post-Phase 1 re-check**: New `RefundRequest` / `PaymentRefund` / `InvoiceSequence`, `retrievePayment` on the port, PROCESSING/CANCELLED, and doctor earnings views are required by spec — justified. Provider still isolated behind `PaymentsPort`. Stitch extras (USD, subscriptions) explicitly rejected. **PASS**.

## Payment Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│ Patient UI          Doctor UI           Admin UI                 │
│ checkout/history    earnings            billing/revenue/audit    │
│ (Stitch shells — no PSP SDK)                                     │
└──────────────┬──────────────────┬────────────────┬──────────────┘
               │ Server Actions   │                │
               ▼                  ▼                ▼
        ┌─────────────────────────────────────────────────────────┐
        │ Payments & Billing Domain  src/domain/billing/*          │
        │ eligibility · state machine · invoices · earnings math   │
        └────────────────────────────┬────────────────────────────┘
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │ Shared Payment Service     src/lib/platform/payments.ts  │
        │                            src/lib/platform/billing.ts   │
        │ intents · webhooks · refund execute · reconcile          │
        └────────────────────────────┬────────────────────────────┘
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │ PaymentsPort               src/ports/payments.ts         │
        └────────────────────────────┬────────────────────────────┘
                                     ▼
        ┌─────────────────────────────────────────────────────────┐
        │ Payment Adapter            stub | future PSP             │
        │ src/adapters/*-payments.ts  selected by PAYMENT_PROVIDER │
        └────────────────────────────┬────────────────────────────┘
                                     ▼
                          Payment Provider (PSP)
```

**Rules**:
- Domain and actions import `@/lib/platform/payments` and `@/domain/billing` only.
- `getPaymentsAdapter()` is the only switch. Future PSP = new adapter file + env value.
- Client may receive `clientSecret` or `redirectUrl` — never secret keys.

## Billing Architecture

- **Obligation** is the source of truth for “what is owed” (1:1 with payable appointment).
- **Attempts** record capture tries; **PaymentRefund** records money out; **RefundRequest** is a workflow, not money.
- Admin revenue = sum Paid captures − sum refunds; Failed/Cancelled excluded.
- Doctor earnings = same math filtered by `Appointment` doctor.
- Billing configuration uses existing Admin settings (audited); does not change locked `amountCents`.

## Transaction Lifecycle

See [data-model.md](./data-model.md). Implement in `src/domain/billing/state-machine.ts` (replace `FAILED → PENDING` in current `domain/platform/billing.ts`).

Pay: PENDING|FAILED → PROCESSING (intent) → PAID|FAILED via webhook/reconcile.  
Cancel unpaid: → CANCELLED.  
Refund: PAID ⇄ PARTIALLY_REFUNDED → REFUNDED.

## Invoice Architecture

- On first PAID: allocate `HK-INV-{year}-{seq}` via `InvoiceSequence` (Asia/Riyadh year, row lock).
- Invoice panel on patient/admin detail (Stitch success/detail fields + number).
- Print route for receipt; optional file on `receiptDocumentId`.
- No VAT lines.

## Refund Architecture

1. Patient `requestRefund` if cancelled before start and remaining > 0 → `RefundRequest PENDING_REVIEW`.
2. Admin approve → `refundObligation` (full remaining or admin-chosen partial) → `PaymentRefund` + credit note + adapter `refund`.
3. Admin reject → request REJECTED; obligation unchanged.
4. Admin may originate refund with reason without a patient request.
5. `providerHandled: false` (stub) = manual settlement note, still record refund in Hakeem.

## Webhook Architecture

Existing `POST /api/webhooks/payments`:
1. Read raw body + signature + timestamp.
2. Adapter `verifyWebhookSignature` → else 400.
3. Skew ≤5 minutes when timestamp present.
4. `parseWebhookEvent` (vendor-neutral).
5. Insert/find `WebhookReceipt`; if `processedAt` set → 200 no-op.
6. Apply forward transition in a DB transaction; enqueue notify/receipt jobs.
7. Never persist raw PAN; store `rawHash` only.

## Database Design / Prisma Models

Documented in [data-model.md](./data-model.md):

- Extend `PaymentStatus` with `PROCESSING`, `CANCELLED`.
- Extend `PaymentObligation`: unique `appointmentId`, `invoiceNumber`, `invoicedAt`, `processingStartedAt`, `lastReconciledAt`.
- New: `PaymentRefund`, `RefundRequest`, `InvoiceSequence`.
- Reuse `WebhookReceipt`, `BackgroundJob` (`PAYMENT_RECONCILE`), `SecurityAuditEvent`.

## API Contracts

[contracts/payments-billing.md](./contracts/payments-billing.md) — port, facades, Server Actions, webhook/cron/receipt HTTP.

## Idempotency Strategy

| Layer | Mechanism |
|-------|-----------|
| Obligation | Unique appointment id |
| Pay | Stable `obligation.idempotencyKey` passed to adapter (stop minting a new UUID per click) |
| In-flight | PROCESSING lock; return existing intent |
| Webhook | `(provider, providerEventId)` |
| Refund | One `PaymentRefund` row per execute; remaining-balance check in transaction |

## Reconciliation Strategy

Job `PAYMENT_RECONCILE`:
- PROCESSING > 15 min → Admin “in-flight” list.
- Call `retrievePayment`.
- Captured → PAID (+ invoice if missing) + notify (correction even if local Failed).
- Not captured and age > 30 min → FAILED; Patient may retry.
- Stub retrieve: pending until 30 min then not captured.

## Audit Strategy

Append-only `SecurityAuditEvent` types listed in data-model. Admin financial audit UI reuses `/admin/audit` filtered to billing types. Invoice/receipt downloads audited. UI cannot edit/delete rows.

## Error Handling

Platform codes. Timeout ≠ Failed. CONFLICT for illegal transitions. RATE_LIMITED after 5 Failed/hour. DEPENDENCY_UNAVAILABLE if adapter throws; leave PROCESSING if intent may exist.

## Security Strategy

- RBAC: existing patient portal, doctor portal, `admin:billing:read|refund`.
- Join gate: unpaid payable appointments cannot start.
- Confirmation dialogs for pay and refund (Stitch/existing ConfirmReasonDialog).
- Anti-enumeration: other patients’ payment ids → 404.
- TLS already required for webhooks/providers.

## Logging

Operational: `obligationId`, `eventId`, `code`, latency class. **Forbidden**: PAN, CVV, `clientSecret`, webhook secrets, raw provider bodies. Correlation id from existing platform pattern when present.

## Monitoring

Reuse Admin System Health **Payments** component. Surface stuck PROCESSING count on billing/revenue. Critical webhook verify failures already notify admins (Module 5). No new APM product.

## Currency Strategy

Integer halalas, `currency = SAR` only. Display `(cents/100).toFixed(2)` with locale grouping. Reject non-SAR at create.

## Future Payment Provider Support

1. Implement `PaymentsPort` in `src/adapters/{vendor}-payments.ts`.
2. Register in `getPaymentsAdapter()` switch.
3. Set `PAYMENT_PROVIDER={vendor}` + vendor secrets (Vercel env; never client).
4. Map vendor webhook headers inside the adapter (`verify`/`parse` only).
5. Domain, invoices, refunds, earnings, UI **unchanged**.

## UI Review (Stitch)

See [ui-review.md](./ui-review.md) and [contracts/ui.md](./contracts/ui.md).

Live Stitch MCP returned **401** after auth in this session; catalog + admin PNGs used. **No new UI generated.**

**Map**: Checkout / Status / Success / History / Invoice / Receipt / Refund banners / Doctor earnings (adapted) / Admin billing & revenue / Transaction detail.

**States**: Loading skeleton, EmptyState, ErrorState, Paid success — existing components. Responsive: stack Stitch desktop toolbars. A11y: labeled receipts, not color-only status. AR/RTL via `next-intl` + existing shells.

**Do not implement** Stitch extras: USD, Subscriptions, Upgrade, Admin “New Payment”.

## Project Structure

### Documentation (this feature)

```text
specs/010-payments-billing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── ui-review.md
├── design/manifest.json
├── contracts/
│   ├── payments-billing.md
│   └── ui.md
└── tasks.md                 # /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
src/
├── ports/payments.ts                         # extend retrievePayment + event types
├── adapters/stub-payments.ts                 # implement retrieve; keep stub
├── adapters/index.ts                         # PAYMENT_PROVIDER switch only
├── domain/billing/
│   ├── state-machine.ts
│   ├── eligibility.ts                        # pay, join, refund request
│   ├── invoices.ts                           # sequence allocate
│   └── earnings.ts
├── lib/platform/payments.ts                  # intents, webhook, reconcile
├── lib/platform/billing.ts                   # refundObligation + credit notes
├── actions/patient/payments.ts               # + requestRefund, receipt
├── actions/doctor/earnings.ts                # new
├── actions/admin/billing.ts                  # filters, requests, partial, reconcile
├── components/platform/payments/             # badge, checkout panel
├── components/patient/payments/
├── components/doctor/earnings/               # new; doctor shell
├── components/admin/billing/
├── app/[locale]/patient/payments/
├── app/[locale]/patient/payments/[id]/receipt/
├── app/[locale]/doctor/earnings/             # new
├── app/[locale]/admin/billing/
├── app/[locale]/admin/revenue/
└── app/api/webhooks/payments/route.ts        # keep; richer events

tests/
├── unit/billing/
├── unit/platform/webhooks.test.ts            # PROCESSING / refunded events
├── integration/admin/refund.test.ts
└── integration/platform/webhooks.test.ts
```

**Structure Decision**: Single Next.js app. Shared service stays under `lib/platform`; **product** billing domain under `src/domain/billing` so Patient/Doctor/Admin do not each reimplement rules. No new package or worker process — reuse platform cron.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Extra tables (RefundRequest, PaymentRefund, InvoiceSequence) | Spec requires request workflow, credit notes, unique yearly invoices | Folding refunds into obligation scalars loses partial history and credit-note identity |
| `retrievePayment` on port | Reconcile without vendor types in domain | Admin-only “guess Failed” after timeout causes duplicate charges |
