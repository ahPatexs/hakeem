# Data Model: Payments & Billing

**Date**: 2026-08-18 | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Reuse Module 5 `PaymentObligation`, `PaymentAttempt`, `WebhookReceipt`, `BackgroundJob`, `SecurityAuditEvent`. Extend; do not create a parallel ledger.

## Enums

### `PaymentStatus` (extend)

| Value | Meaning |
|-------|---------|
| PENDING | Obligation exists; Patient has not submitted pay |
| PROCESSING | Pay submitted; provider capture not confirmed |
| PAID | Capture confirmed; invoice number assigned |
| FAILED | Provider declined **or** reconcile confirmed no capture |
| CANCELLED | Appointment cancelled before capture |
| PARTIALLY_REFUNDED | Some captured amount returned |
| REFUNDED | Remaining captured amount is zero |
| DISPUTED | Admin overlay (existing); does not replace user-facing statuses |

### `RefundRequestStatus`

`PENDING_REVIEW` | `APPROVED` | `REJECTED`

### `PaymentAttemptKind`

`CAPTURE` | `REFUND` (optional discriminator on attempts; or keep refunds on `PaymentRefund` only)

## Entities

### `PaymentObligation` (extend)

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | PK |
| patientUserId | string | FK User |
| appointmentId | string? | **Unique** when set (1:1 payable appointment) |
| description | string | Visit/service label |
| amountCents | int | Locked SAR halalas; > 0 |
| currency | string | Always `SAR` |
| status | PaymentStatus | See machine below |
| providerRef | string? | Latest provider intent/charge id |
| idempotencyKey | string | **Unique**; stable for the life of the obligation |
| invoiceNumber | string? | Unique; set on first Paid |
| invoicedAt | datetime? | Asia/Riyadh assignment time |
| receiptDocumentId | string? | Optional generated file |
| refundedAmountCents | int | Sum of executed refunds |
| refundReason | string? | Last executed refund reason (legacy; prefer PaymentRefund) |
| failedAttemptCountWindow | int / datetime | For 5/hour rate limit (or derive from attempts) |
| processingStartedAt | datetime? | Enter PROCESSING |
| lastReconciledAt | datetime? | |
| createdAt / updatedAt | datetime | |

**Validation**: `amountCents >= 1` for payable; `currency === "SAR"`; unique `appointmentId`; unique `idempotencyKey`; unique `invoiceNumber` when not null.

### `PaymentAttempt` (extend)

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | |
| obligationId | string | FK |
| providerIntentId | string | |
| status | PaymentStatus | Attempt-level: PENDING/PROCESSING/PAID/FAILED |
| rawEventId | string? | Last applied provider event id |
| failureCode | string? | Safe class (e.g. `declined`), never raw PAN |
| createdAt | datetime | |

**Index**: `(obligationId, createdAt)`; unique `(providerIntentId)` if provider guarantees uniqueness.

### `PaymentRefund` (new)

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | |
| obligationId | string | FK |
| amountCents | int | 1 .. remaining at execute time |
| currency | string | SAR |
| creditNoteNumber | string | Unique |
| reason | string | Required ≥10 chars (existing reason policy) |
| actorUserId | string | Admin who executed |
| refundRequestId | string? | FK if from patient request |
| providerRefundId | string? | |
| providerHandled | boolean | false = manual settlement |
| createdAt | datetime | |

### `RefundRequest` (new)

| Field | Type | Notes |
|-------|------|-------|
| id | cuid | |
| obligationId | string | FK |
| patientUserId | string | |
| requestedAmountCents | int | Full remaining at request time |
| status | RefundRequestStatus | |
| patientNote | string? | |
| decisionReason | string? | Admin reject/approve note |
| decidedByUserId | string? | |
| decidedAt | datetime? | |
| createdAt | datetime | |

**Validation**: One **open** (`PENDING_REVIEW`) request per obligation. Eligibility checked at request time (appointment cancelled before start, remaining > 0).

### `InvoiceSequence` (new)

| Field | Type | Notes |
|-------|------|-------|
| kind | string | `INV` or `CN` |
| year | int | Asia/Riyadh calendar year |
| lastNumber | int | Monotonic |

**Unique**: `(kind, year)`. Allocate in a transaction with row lock.

### Existing (reuse)

| Entity | Role |
|--------|------|
| `WebhookReceipt` | Idempotent provider event apply |
| `BackgroundJob` | `PAYMENT_RECONCILE`, receipt/notify side effects |
| `SecurityAuditEvent` | Financial audit |
| `Appointment` | `startsAt`, status, doctor, price source; join gate |
| `Notification` | payment.received / refund / failed |

## State machine

```text
PENDING ──► PROCESSING ──► PAID ──► PARTIALLY_REFUNDED ──► REFUNDED
   │            │             │
   │            ├─► FAILED ──► PROCESSING (retry, same obligation)
   │            └─► CANCELLED
   └──────────────► CANCELLED

PAID / PARTIALLY_REFUNDED ──► DISPUTED (annotation)
Reconcile correction: FAILED ──► PAID (only if provider captured; one charge)
```

**Rules**:
- Pay allowed from PENDING or FAILED only; blocked in PROCESSING.
- Refund execute: PAID or PARTIALLY_REFUNDED and remaining > 0.
- Remaining = `amountCents - refundedAmountCents`.
- No refund on CANCELLED/FAILED with zero capture.
- Invoice number assigned exactly once on transition to PAID.

## Relationships

```text
Appointment 1 ── 0..1 PaymentObligation
User (patient) 1 ── * PaymentObligation
PaymentObligation 1 ── * PaymentAttempt
PaymentObligation 1 ── * PaymentRefund
PaymentObligation 1 ── * RefundRequest
PaymentObligation 1 ── * WebhookReceipt (optional)
PaymentRefund 0..1 ── RefundRequest
Doctor 1 ── * Appointment ── 0..1 PaymentObligation  (earnings via join)
```

## Indexes

- `PaymentObligation(patientUserId, createdAt)`
- `PaymentObligation(status, processingStartedAt)` — stuck Processing
- `PaymentObligation(appointmentId)` unique where not null
- `PaymentObligation(invoiceNumber)` unique where not null
- Appointments for doctor earnings: join `Appointment.doctorId` + obligation status/paid amounts

## Authorization (data)

| Role | Read | Write money |
|------|------|-------------|
| Patient | Own obligations, requests, invoices | Pay own; create refund request |
| Doctor | Obligations for own appointments (no PAN, no admin refund) | None |
| Admin (`admin:billing:read`) | All | — |
| Admin (`admin:billing:refund`) | All | Refund execute, request decision, billing config |

## Audit event types (new / extend)

`billing.pay_submit` · `billing.paid` · `billing.failed` · `billing.cancelled` · `billing.refund_request` · `billing.refund_decision` · `billing.refund_executed` · `billing.reconcile_correction` · `billing.invoice_download` · `billing.config_change`

Fields: actor, target obligation id, amounts, outcome. No PAN/CVV/secrets.
