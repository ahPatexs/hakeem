# Quickstart: Payments & Billing validation

**Feature**: `010-payments-billing` | **Date**: 2026-08-18

Runnable checks after implementation. Details: [contracts/payments-billing.md](./contracts/payments-billing.md), [data-model.md](./data-model.md), [ui-review.md](./ui-review.md).

## Prerequisites

- Neon/Postgres; `DATABASE_URL` set
- Migrations including PROCESSING/CANCELLED, invoice fields, `PaymentRefund`, `RefundRequest`, `InvoiceSequence`
- Seeded Patient, Doctor, Admin (existing demo accounts)
- `PAYMENT_PROVIDER=stub` (default)
- Dev server: `npm run dev`

## Setup

```bash
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

## Validation scenarios

### 1. Patient checkout (P1)

1. As Patient, open a payable appointment (price > 0).
2. Confirm displayed amount is SAR and matches the obligation.
3. Confirm pay → status **Processing**; Pay disabled.
4. POST signed stub webhook `paid` to `/api/webhooks/payments`.
5. Status **Paid**; invoice number `HK-INV-…`; receipt print route works.
6. Join/start visit is allowed only after Paid.

**Expect**: One obligation, one capture, no PAN in page source.

### 2. Duplicate pay (P1)

1. Double-click Pay (or call create intent twice) during Processing.
2. Replay the same webhook `eventId`.

**Expect**: Still one Paid charge; second webhook `applied: false`.

### 3. Failed + retry (P1)

1. Webhook `failed` (decline) → Failed; visit not joinable.
2. Retry Pay → Processing again, same obligation.
3. Five Failed attempts within an hour → rate-limited message.

**Expect**: Timeout path stays Processing (do not webhook fail immediately on client timeout).

### 4. Refund request + partial (P1)

1. Cancel appointment **before** start while Paid.
2. Patient requests refund → under review; still Paid.
3. Admin rejects → remains Paid with reason.
4. Patient requests again; Admin approves **partial** → Partially Refunded + credit note.
5. Admin refunds remainder → Refunded; further refund blocked.

**Expect**: Doctor earnings net drops by refunded amounts. Audit rows for request, decision, execute.

### 5. Appointment consistency (P1)

1. Unpaid payable visit → join blocked.
2. Cancel before pay → Cancelled; no Pay.
3. Zero-price visit → no payment required.

### 6. Doctor earnings (P2)

1. As Doctor, open `/doctor/earnings`.
2. Period summary matches sum of own Paid visits minus refunds.
3. No refund/pay controls; another doctor’s visits absent.

### 7. Admin finance (P1)

1. `/admin/billing`: filter Failed, Processing >15m, Refunded.
2. `/admin/revenue`: gross, refunds, net for a range.
3. Trigger reconcile on a stuck stub obligation.
4. Invalid webhook signature → 400, no status change.

### 8. UI / i18n smoke

1. EN and AR: payments, earnings, admin billing.
2. Empty history, loading skeleton, pay error, Paid success — existing Empty/Error/Loading components, no new palette.
3. Screens remain in Patient/Doctor/Admin shells (no Subscriptions/Upgrade chrome).

## Automated checks (after implement)

```bash
npx vitest run tests/unit/billing tests/unit/platform/webhooks tests/unit/admin/billing-refund
npx vitest run tests/integration/platform/webhooks tests/integration/admin/refund
```

Add coverage for: PROCESSING transitions, invoice uniqueness, refund request eligibility, reconcile Failed→Paid correction, rate limit.
