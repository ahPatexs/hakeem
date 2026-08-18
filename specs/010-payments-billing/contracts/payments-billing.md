# Contract: Payments & Billing

**Feature**: `010-payments-billing` | **Date**: 2026-08-18

Portals call **domain + platform facades**, never adapters. HTTP is limited to webhooks, cron, and receipt download.

## Outcome taxonomy

Reuse Module 5 `PlatformResult` / `PlatformCode` (`OK`, `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `DEPENDENCY_UNAVAILABLE`, `INTERNAL_FAILURE`).

## Architecture boundary

```text
UI (Patient / Doctor / Admin)
  → Server Actions (`src/actions/{patient,doctor,admin}/billing|payments|earnings.ts`)
  → Domain (`src/domain/billing/*`)
  → Shared Payment Service (`src/lib/platform/payments.ts`, `billing.ts`)
  → PaymentsPort (`src/ports/payments.ts`)
  → Adapter (`src/adapters/stub-payments.ts` | future PSP)
```

## PaymentsPort (extend; vendor-neutral)

```ts
type PaymentProviderStatus = "pending" | "processing" | "succeeded" | "failed" | "cancelled";

interface CreatePaymentIntentInput {
  obligationId: string;
  amountCents: number;
  currency: "SAR";
  idempotencyKey: string; // MUST be obligation.idempotencyKey
  description?: string;
  patientUserId: string;
}

interface PaymentIntentResult {
  providerIntentId: string;
  clientSecret?: string;  // provider-hosted fields only
  redirectUrl?: string;
  status: PaymentProviderStatus;
}

interface RetrievePaymentInput {
  providerIntentId: string;
  obligationId: string;
}

interface RetrievePaymentResult {
  providerIntentId: string;
  status: PaymentProviderStatus;
  captured: boolean;
  capturedAmountCents?: number;
}

interface PaymentWebhookEvent {
  eventId: string;
  obligationId: string;
  providerIntentId: string;
  status: "processing" | "paid" | "failed" | "refunded";
  refundAmountCents?: number;
}

interface PaymentsPort {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
  retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentResult>;
  verifyWebhookSignature(payload: string | Buffer, signature: string): boolean;
  parseWebhookEvent(payload: string | Buffer): PaymentWebhookEvent;
  refund(input: RefundPaymentInput): Promise<RefundPaymentResult>;
}
```

**Forbidden in this interface**: vendor charge objects, PAN, customer vault IDs leaked to UI beyond brand/last4.

## Shared Payment Service facades

```ts
createPaymentIntent(input: {
  obligationId: string;
  patientUserId: string;
}): Promise<PlatformResult<{
  providerIntentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  status: "PROCESSING";
}>>;

applyPaymentWebhook(input: {
  rawBody: string;
  signature: string;
  timestamp?: string | null;
}): Promise<PlatformResult<{ eventId: string; applied: boolean }>>;

refundObligation(input: {
  obligationId: string;
  amountCents: number;
  reason: string;
  actorUserId: string;
  refundRequestId?: string;
}): Promise<PlatformResult<{ creditNoteNumber: string }>>;

reconcileObligation(input: {
  obligationId: string;
}): Promise<PlatformResult<{ status: PaymentStatus }>>;
```

**Pay rules**: Reuse `obligation.idempotencyKey`. If already PROCESSING, return existing intent (CONFLICT not required if returning same intent). If Failed count ≥5 in the last hour → `RATE_LIMITED`.

## Billing domain (product)

```ts
assertCanPay(obligation, patientUserId): void;
assertCanJoinAppointment(appointmentId): void; // Paid or zero-price
assertPatientRefundEligible(obligation, appointment): void;
createRefundRequest(...): Promise<RefundRequest>;
decideRefundRequest(id, approve, reason, actorUserId): Promise<void>;
allocateInvoiceNumber(year): Promise<string>; // HK-INV-YYYY-NNNNNN
allocateCreditNoteNumber(year): Promise<string>;
earningsSummary(doctorId, from, to): Promise<{
  grossCents: number;
  refundCents: number;
  netCents: number;
  visits: number;
}>;
```

## Server Actions (by role)

### Patient (`src/actions/patient/payments.ts`)

| Action | Auth | Behavior |
|--------|------|----------|
| `listPayments` | Patient | Own history, default 24 months, filters |
| `getPayment` | Patient | Detail + attempts + refunds + requests |
| `createPaymentIntent` | Patient | Facade; confirmation required in UI |
| `requestRefund` | Patient | Full remaining; eligibility |
| `downloadReceipt` | Patient | Invoice/credit note artifact |

### Doctor (`src/actions/doctor/earnings.ts`)

| Action | Auth | Behavior |
|--------|------|----------|
| `getEarningsSummary` | Doctor | Own consultations only |
| `listPaidConsultations` | Doctor | Status + amounts |
| `listDoctorTransactions` | Doctor | Charges + refunds |

### Admin (`src/actions/admin/billing.ts` — extend)

| Action | Permission | Behavior |
|--------|------------|----------|
| `listPayments` | billing:read | All + filters (status, failed, processing>15m, refunds) |
| `getPayment` | billing:read | Transaction detail |
| `revenueSummary` | billing:read | Gross, refunds, net, failed count, stuck count |
| `refundPayment` | billing:refund | Full/partial ≤ remaining |
| `listRefundRequests` | billing:read | |
| `decideRefundRequest` | billing:refund | Approve (calls refundObligation) / reject |
| `reconcileStuck` | billing:refund | Trigger retrieve for one or batch |
| `updateBillingConfig` | settings:write | Audited flags only |

## HTTP

### `POST /api/webhooks/payments`

Unchanged path. Headers: provider signature + timestamp. 200 idempotent replay; 400 invalid/stale; 500 retryable. No billing change on 400.

### `POST /api/cron/platform-jobs`

Existing worker. New job types: `PAYMENT_RECONCILE`, `PAYMENT_RECEIPT_SIDE_EFFECT`.

### `GET /[locale]/patient/payments/[id]/receipt`

Authenticated Patient; print-friendly invoice/receipt. 404 if never captured. Audit `billing.invoice_download`.

## Idempotency

| Operation | Key |
|-----------|-----|
| Obligation create | unique `appointmentId` |
| Pay | `obligation.idempotencyKey` |
| Webhook | `(provider, providerEventId)` |
| Refund execute | `PaymentRefund` row; adapter refund id if present |
| Reconcile | job `(PAYMENT_RECONCILE, obligationId)` |

## Error mapping (user-facing)

| Code | Patient/Doctor copy class |
|------|---------------------------|
| CONFLICT (already paid / processing) | Already paid / payment in progress |
| RATE_LIMITED | Too many failed tries; wait |
| DEPENDENCY_UNAVAILABLE | Payment service busy; status Processing |
| VALIDATION_ERROR | Refund not allowed / amount invalid |
| FORBIDDEN | Not your bill / no billing permission |

Never show raw provider JSON or card numbers.
