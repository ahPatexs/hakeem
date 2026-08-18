# Contract: Payments & Billing UI (Stitch-aligned)

**Feature**: `010-payments-billing` | **Date**: 2026-08-18  
**Stitch project**: `2408493713147971043`  
**Rule**: Do **not** redesign. Match approved screens; reuse `components/platform` + existing portal shells.

Full mapping: [ui-review.md](../ui-review.md).

## Surfaces

| Surface | Stitch / existing SoT | Route |
|---------|----------------------|-------|
| Patient payment dashboard / status widget | Payment Status + dashboard widget | `/patient` widget + `/patient/payments` |
| Checkout | Secure Checkout - Hakeem `baccb518b56e49e086747e71e82b8d29` | `/patient/payments/[id]` pay |
| Payment confirmation | Payment Successful - Hakeem `481ec39d22eb4e35b7a11c6e901e1c89` | same, Paid state |
| Payment failed | Payment Status failed treatment | same, Failed state |
| Payment status | Payment Status - Hakeem `5d6ca3aa9af348519e002592be6ed3d8` | badge + detail |
| Payment history | Patient payments list (existing chrome) | `/patient/payments` |
| Invoice details | Success/detail composition + invoice number | `/patient/payments/[id]` |
| Receipt | Print-friendly of invoice (Stitch success fields) | `/patient/payments/[id]/receipt` |
| Refund status | Status badge + request banner on detail | patient + admin billing detail |
| Doctor earnings | Adapt Payment Dashboard table/KPI into Doctor shell | `/doctor/earnings` |
| Admin billing dashboard | Billing & Transactions `58eef7a7942a42e1badc0691b45c7a8f` + `d-admin-billing.png` | `/admin/billing` |
| Revenue analytics | Payment & Revenue `3a2b410376554f0782356d493a8b1b9b` + `d-admin-revenue.png` | `/admin/revenue` |
| Transaction details | Admin billing detail (existing) | `/admin/billing/[obligationId]` |

## Component contracts

```ts
<PaymentStatusBadge status={PaymentStatus} /> // include PROCESSING, CANCELLED

<PaymentCheckoutPanel
  obligation={{ amountCents, currency: "SAR", description, invoiceNumber? }}
  status={PaymentStatus}
  onPay={() => Promise<void>}
  processing?
/>

<PaymentHistoryList items page total />
<InvoicePanel obligation refunds />
<ReceiptDocument obligation /> // print
<RefundRequestBanner request />
<EarningsSummary cards />
<EarningsTable rows />
<AdminTransactionTable rows filters exportCsv />
<RevenueOverview cards chart? /> // chart only if already in admin analytics chrome
```

## Visual tokens

Existing: `text-primary` (`#00436f`), `med-green` (`#00a884`), `warm-coral`, `surface-container-*`, `font-headline`. **SAR** not USD. Do not add Subscriptions / Upgrade / Admin “New Payment” from Stitch extras.

## Localization & a11y

- `next-intl` keys under `patient.payments`, `doctor.earnings`, `admin.billing`, `platform.payments`
- Arabic RTL on shells already used
- Loading: `aria-busy` + existing `ListSkeleton`
- Empty: existing `EmptyState`
- Error: existing `ErrorState` + retry
- Success: Paid confirmation copy from Stitch Successful screen
- Status not color-only (badge text)
- Icon-only invoice/receipt: `aria-label`

## Out of scope visually

- New marketing illustrations
- New palette
- Implementing Stitch “Subscriptions”, “Upgrade”, USD amounts, or admin-created card charges
