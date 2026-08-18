# UI Review: Payments & Billing (Stitch)

**Date**: 2026-08-18 | **Feature**: `010-payments-billing`  
**Stitch project**: `2408493713147971043` (`Hakeem AI Healthcare Landing Page`)  
**Directive**: Do **not** redesign. Approved Stitch is SoT where screens exist.

## Review method

1. Attempted Stitch MCP `mcp_auth` then `list_screens` / `get_screen` for project `2408493713147971043`.
2. **Result**: MCP reported authenticated, then **401** on screen APIs (same class of failure documented in `specs/003-patient-portal/design/manifest.json`). Live pixel pull was **not** available in this session.
3. Validated against:
   - Screen catalog from Module 5 [ui-review.md](../006-platform-services/ui-review.md) and Module 4 [ui-review.md](../005-admin-portal/ui-review.md)
   - Exported admin PNGs: `specs/005-admin-portal/design/d-admin-billing.png`, `d-admin-revenue.png`
   - Current code: patient payments pages, dashboard widget, admin billing/revenue, platform payment badge, empty/error/loading primitives

**PNG pack for this feature**: [design/manifest.json](./design/manifest.json) (`exported: false` for patient/doctor payment frames until optional re-export). Implementation must still match Stitch + existing Hakeem tokens.

## Stitch sources

| Required surface | Stitch title | Screen id | Notes |
|------------------|--------------|-----------|-------|
| Payment Dashboard | Payment Dashboard / Patient payments list | SCREEN_37 in doctor workspace org; Patient Payments in product | History + outstanding |
| Checkout | Secure Checkout - Hakeem | `baccb518b56e49e086747e71e82b8d29` | Amount SAR, pay CTA |
| Payment Confirmation | Payment Successful - Hakeem | `481ec39d22eb4e35b7a11c6e901e1c89` | Success copy |
| Payment Failed | Payment Status (failed) | `5d6ca3aa9af348519e002592be6ed3d8` | Failed treatment on status screen |
| Payment Status | Payment Status - Hakeem | `5d6ca3aa9af348519e002592be6ed3d8` | Badge + in-flight |
| Payment History | Patient Payments list (same family) | Patient payments routes | Filters/pagination per spec |
| Invoice Details | Success/detail composition | Same as confirmation + id | Invoice number field |
| Receipt | Print of invoice/success fields | No separate Stitch title found | Print route, do not invent art |
| Refund Status | Status badges on billing/detail | Admin billing + patient detail | Banner, not a new page type |
| Doctor Earnings | No dedicated exported screen | Adapt Payment Dashboard table/KPI in **Doctor shell** | Do not new visual language |
| Admin Billing Dashboard | Billing & Transactions - Hakeem | `58eef7a7942a42e1badc0691b45c7a8f` | `d-admin-billing.png` |
| Revenue Analytics | Payment & Revenue Management | `3a2b410376554f0782356d493a8b1b9b` | `d-admin-revenue.png` |
| Transaction Details | Admin billing detail | existing `/admin/billing/[id]` | Extend fields, same chrome |

## Validation matrix (required screens)

| Surface | Stitch / design expectation | Current codebase | Plan action | Redesign? |
|---------|----------------------------|------------------|-------------|-----------|
| Payment Dashboard | Outstanding + history entry | Dashboard widget + `/patient/payments` | Complete Processing/Paid/Failed; invoice # | **No** |
| Checkout | Secure Checkout, SAR, confirm | Detail page stub copy only | Wire `PaymentCheckoutPanel` + `usePaymentIntent` | **No** |
| Confirmation | Successful screen | Missing dedicated success state | Show Paid panel on same route | **No** |
| Failed | Clear failed + retry | Partial (badge) | Failed copy + retry CTA | **No** |
| Status | Badge all lifecycle states | Badge missing PROCESSING/CANCELLED | Extend `PaymentStatusBadge` | **No** |
| History | List, amount, status | List exists | Filters, 24 months, invoice | **No** |
| Invoice details | Amount, refs, number | Description + amount only | Invoice + attempts + refunds | **No** |
| Receipt | Download/print | `receiptDocumentId` unused | Print route | **No** |
| Refund status | Request vs executed | Admin refund only | Patient request banner + admin queue | **No** |
| Doctor earnings | KPI + paid visits table | **Missing route/nav** | `/doctor/earnings` using doctor shell + table chrome | **No** |
| Admin billing | Title, date range, status filter, export, table | Table without filters/export | Add filters/export; keep Admin shell | **No** |
| Revenue analytics | KPI cards, period, recent tx | `/admin/revenue` exists | Gross/refunds/net + failed/stuck | **No** |
| Transaction details | Row → detail, refund | Detail + refund dialog | Partial amount, requests, audit link | **No** |

## Cross-cutting UI states

| Criterion | Result | Plan |
|-----------|--------|------|
| Loading | No dedicated Stitch “loading” payment frames | Existing `ListSkeleton` / `aria-busy` |
| Empty | Patient empty payments exists; Admin lists use generic empty | Reuse `EmptyState`; All Caught Up is notifications-only |
| Error | Portal `ErrorState` + retry | Keep; safe copy; no raw provider errors |
| Success | Stitch Payment Successful | Paid confirmation on detail; toast optional if shell already toasts |
| Responsive | Admin Stitch is desktop-wide | Stack filters; table scroll; existing portal breakpoints |
| Accessibility | Not fully verifiable from PNGs | WCAG 2.2 AA on pay/refund; labeled icon receipts; keyboard dialogs |
| Arabic / RTL | Portal shells already RTL | All new strings via `next-intl`; SAR locale numerals |

## Findings (do not copy Stitch extras)

Admin billing/revenue PNGs include chrome that **contradicts** Module 8 product rules:

- Currency shown as **USD (`$`)** — product is **SAR only**
- **Subscriptions**, **Upgrade**, **+ New Payment** (admin-created charges)
- Hospital-wide “Medical Billing Admin” nav that is **not** the live Hakeem Admin shell

**Implementation rule**: Keep the **existing Hakeem Admin / Patient / Doctor shells**. Use Stitch for **composition** (title, KPIs, date range, status filter, export, table columns: id, date, party, service, amount, status, invoice). Do **not** add subscriptions, upgrade CTAs, or admin card capture.

Doctor earnings has **no** exported unique screen. Add a nav item and page that reuses doctor shell + admin/patient table/KPI density.

## Gaps (implementation — not redesign)

1. Checkout still shows stub note; not wired to Secure Checkout panel.
2. PROCESSING / CANCELLED not in badge or enum.
3. No receipt print route; no invoice numbers in UI.
4. No patient refund-request UI.
5. No doctor earnings nav/page.
6. Admin billing missing date/status filters and CSV export from Stitch toolbar.
7. Live Stitch MCP 401 — optional later PNG export into `specs/010-payments-billing/design/`.

## Gate

| Workstream | Gate |
|------------|------|
| Domain / Prisma / ports / actions | **Unblocked** |
| UI implementation | **Unblocked** using catalog + existing shells + admin PNGs |
| Pixel QA vs live Stitch | **Deferred** until MCP export works; do not invent new UI while waiting |

**Summary**: Stitch coverage exists for checkout, status, success, admin billing, and revenue. Complete product billing **inside those frames**. Do not redesign. Ignore Stitch billing extras that fight SAR-only, no-admin-charge, no-subscriptions v1.
