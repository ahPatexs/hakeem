# Research: Payments & Billing

**Date**: 2026-08-18 | **Feature**: `010-payments-billing`  
**Spec**: [spec.md](./spec.md)

All Technical Context unknowns are resolved. Provider-specific SDKs stay behind Module 5 adapters; this module owns product billing.

## Decision 1 — Layered payment architecture (no provider in domain)

- **Decision**: Enforce a strict stack:

  ```text
  Payment Provider (card scheme / PSP)
          ↓
  Payment Adapter (`src/adapters/*-payments.ts`)
          ↓
  PaymentsPort (`src/ports/payments.ts`)
          ↓
  Shared Payment Service (`src/lib/platform/payments.ts`, `billing.ts`)
          ↓
  Payments & Billing Domain (`src/domain/billing/*`)
          ↓
  Patient / Doctor / Admin (actions + Stitch-aligned UI)
  ```

  Product code (Server Actions, pages, domain rules) **never** imports a vendor SDK. `PAYMENT_PROVIDER` selects the adapter only in `src/adapters/index.ts`.

- **Rationale**: Spec FR-017 and user architecture requirement. Replacing the PSP must not rewrite invoices, refunds, or appointment gates.
- **Alternatives considered**: Portal-local Stripe/Moyasar calls (rejected — duplicates Module 5). Multi-provider routing (out of v1).

## Decision 2 — Extend Module 5; do not fork a second gateway

- **Decision**: Harden existing `PaymentsPort`, `createPaymentIntent`, `applyPaymentWebhook`, `refundObligation`. Add retrieve/reconcile + refund outcome events on the **same** port. Keep stub adapter as default; live adapter is a future `PAYMENT_PROVIDER` value.
- **Rationale**: Module 5 already owns webhooks, signature, skew, `WebhookReceipt`. Module 8 completes product workflows (Processing, invoices, refund requests, doctor earnings, appointment consistency).
- **Alternatives considered**: New `BillingPort` that talks to the PSP (rejected — would leak provider into billing).

## Decision 3 — Transaction lifecycle (forward-only + corrections)

- **Decision**: Prisma `PaymentStatus` gains **PROCESSING** and **CANCELLED**. Canonical machine:

  ```text
  PENDING → PROCESSING → PAID → PARTIALLY_REFUNDED → REFUNDED
       │         │          │
       │         ├→ FAILED → PROCESSING (retry)
       │         └→ CANCELLED
       └→ CANCELLED
  PAID / PARTIALLY_REFUNDED → DISPUTED (admin overlay, not a user-facing seventh state)
  ```

  Illegal: Paid → Pending; Refunded → Paid. **Exception**: reconcile may set Failed → Paid when the provider captured money (single charge, notify patient). Timeouts stay **PROCESSING**, not Failed.

- **Rationale**: Spec FR-003, FR-023, FR-024, FR-031. Current code allows FAILED → PENDING and lacks PROCESSING/CANCELLED.
- **Alternatives considered**: Keep PENDING during in-flight (rejected — Patient cannot distinguish “not started” vs “card in flight”). Immediate Failed on timeout (rejected — duplicate-charge risk).

## Decision 4 — Idempotency strategy

- **Decision**:
  | Operation | Key |
  |-----------|-----|
  | Create obligation | Unique `(appointmentId)` where payable (1:1) |
  | Pay submit | `obligation.idempotencyKey` reused for all intents on that obligation; adapter also receives it |
  | In-flight lock | Status PROCESSING + unique open attempt; second Pay returns existing intent |
  | Provider notice | `WebhookReceipt (provider, providerEventId)` |
  | Refund execute | `refund:{obligationId}:{amountCents}:{requestId}` job + `PaymentRefund.id` |
  | Reconcile job | `reconcile:{obligationId}:{window}` |

- **Rationale**: Spec FR-015 / SC-002. Current `createPaymentIntent` mints a **new** UUID per call — that is a duplicate-charge bug if the adapter is not itself idempotent.
- **Alternatives considered**: Per-click UUID (rejected). Database advisory locks only (insufficient without provider keys).

## Decision 5 — Webhook architecture

- **Decision**: Keep `POST /api/webhooks/payments` as the only inbound PSP route. Verify signature via adapter; reject skew >5 minutes; ACK quickly; apply state in a transaction; enqueue notification/receipt jobs. Extend parsed events: `paid | failed | refunded | processing` (map to domain). Never log raw bodies with PAN.
- **Rationale**: Module 5 contract already specifies this. Module 8 adds PROCESSING and refund notices.
- **Alternatives considered**: Client-only “paid” (rejected — not system of record). Per-portal webhook routes (rejected).

## Decision 6 — Reconciliation strategy

- **Decision**: Cron job `PAYMENT_RECONCILE` (existing platform jobs worker). Select obligations PROCESSING >15 minutes (Admin list) or >30 minutes (mark Failed if adapter `retrieveIntent` says no capture). If retrieve says captured → Paid + invoice number + notify (correction). Adapter method `retrievePayment(providerIntentId)` is required on `PaymentsPort` (stub returns last known).
- **Rationale**: Spec FR-024. Stub/demo can no-op retrieve as “still pending” then Failed after 30 minutes.
- **Alternatives considered**: Manual-only reconcile (insufficient). Polling from the browser (insecure / flaky).

## Decision 7 — Invoice & receipt architecture

- **Decision**: `InvoiceSequence` table (year + lastNumber) in Asia/Riyadh; assign `invoiceNumber` on first Paid (`HK-INV-YYYY-NNNNNN`). `PaymentRefund` rows get `creditNoteNumber` (`HK-CN-YYYY-NNNNNN`). Receipts: print-friendly HTML route matching Stitch success/detail (PDF optional via print). Store `receiptDocumentId` when a file is generated; never embed PAN.
- **Rationale**: Spec FR-027, FR-028. No tax engine (FR-026).
- **Alternatives considered**: CUID as invoice number (not human-readable). External invoicing SaaS (out of scope).

## Decision 8 — Refund architecture

- **Decision**: New `RefundRequest` (patient, full remaining, PENDING_REVIEW | APPROVED | REJECTED). Money moves only via existing `refundObligation` after admin approve. Partial amount is admin-only. Each execution creates `PaymentRefund`. Eligibility: appointment cancelled before `startsAt`. Admin may originate refunds with reason regardless of patient eligibility.
- **Rationale**: Spec FR-007, FR-014, FR-032.
- **Alternatives considered**: Auto-refund (rejected for v1). Patient-chosen partials (rejected).

## Decision 9 — Appointment / payment consistency

- **Decision**: Create obligation at booking when priceCents > 0 (unique appointmentId). Join/start video or in-person “ready” checks `assertAppointmentPayable(appointmentId)` → must be Paid (or zero-price). Cancel before capture → CANCELLED. Cancel after Paid → stay Paid until refund.
- **Rationale**: Spec FR-030 / SC-012. Not implemented today.
- **Alternatives considered**: Pay-later after visit (rejected for payable visits in this spec).

## Decision 10 — PCI, security, audit, logging, monitoring

- **Decision**: Checkout uses provider-hosted fields or redirect (`clientSecret` / `redirectUrl` only). No PAN/CVV columns. Audit via existing `SecurityAuditEvent` with new types (pay submit, refund request/decision, invoice download, reconcile correction, billing config). Operational logs: obligation id, event id, outcome — never secrets. Payments component already on Admin health; stuck PROCESSING count is a billing KPI + optional health signal.
- **Rationale**: Spec FR-013, FR-021, FR-029, SC-008, SC-011.
- **Alternatives considered**: Store cards in Neon (forbidden). Separate PCI vault product (not needed if PSP hosts fields).

## Decision 11 — Currency

- **Decision**: Integer **halalas** (`amountCents`), `currency` always `SAR`. Display two decimals, locale grouping. Reject non-SAR at obligation create.
- **Rationale**: Spec FR-025; matches existing schema.
- **Alternatives considered**: Decimal columns (rounding risk). Multi-currency (out of v1).

## Decision 12 — Future provider support

- **Decision**: New PSP = new adapter implementing `PaymentsPort` + `PAYMENT_PROVIDER=<name>`. Port methods stay vendor-neutral: createIntent, retrievePayment, verifyWebhook, parseWebhook, refund. Domain tests use a fake adapter. No Moyasar/Stripe types in `domain/billing`.
- **Rationale**: User requirement to replace provider without changing billing domain.
- **Alternatives considered**: Adapter-specific webhooks per vendor path (rejected — one route, adapter parses).

## Decision 13 — UI source of truth

- **Decision**: Do **not** redesign. Stitch project `2408493713147971043`. Patient: Secure Checkout / Payment Status / Payment Successful + existing payments list. Admin: Billing & Transactions + Payment & Revenue PNGs for **table/KPI composition**, mapped onto the **existing Hakeem Admin shell** (ignore Stitch extras: USD, Subscriptions, Upgrade, Admin “New Payment”). Doctor earnings: no dedicated exported screen — reuse Payment Dashboard / table chrome inside Doctor shell.
- **Rationale**: Spec FR-019. Live Stitch MCP 401 during this plan; catalog from Module 5/4 reviews + exported admin PNGs. See [ui-review.md](./ui-review.md).
- **Alternatives considered**: New earnings visual system (rejected). Implementing USD/subscription chrome (contradicts SAR-only spec).

## Decision 14 — Error handling

- **Decision**: Reuse platform outcome taxonomy (`VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `DEPENDENCY_UNAVAILABLE`, …). Map to localized copy. Pay during PROCESSING → CONFLICT. 5 Failed attempts/hour → RATE_LIMITED. Provider timeout → stay PROCESSING + DEPENDENCY_UNAVAILABLE on sync UX after 10s without flipping Failed.
- **Rationale**: Spec FR-031; Module 5 error taxonomy.
- **Alternatives considered**: HTTP 402 as primary UX (not user-friendly).
