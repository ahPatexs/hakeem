# Contract: Shared Platform UI (Stitch-aligned)

**Feature**: `006-platform-services` | **Date**: 2026-07-30  
**Stitch project**: `2408493713147971043`  
**Rule**: Do **not** redesign. Match approved screens; consolidate duplicated portal primitives into `components/platform`.

## Surfaces in scope

| Surface | Expected behavior | Notes |
|---------|-------------------|-------|
| Shared dialogs | Modal overlay, title, description, primary/secondary actions; reason textarea min 10 where destructive | Align with existing ConfirmReasonDialog + Stitch dialogs |
| Shared notifications | List rows, unread emphasis, mark read, optional deep link | Patient/Doctor/Admin centers consume same row primitive |
| Shared upload | Dropzone/button, filename, progress, PENDING scan state, rejection message | No public URL display |
| Shared payment | Amount/currency SAR, status badge, pay CTA / processing / success-failure | Intent client secret or redirect only |
| Empty states | Short title + optional hint; no decorative card spam | Reuse EmptyState |
| Error states | Safe message + retry when applicable | Reuse ErrorState |
| Loading states | Skeleton / aria-busy | Reuse ListSkeleton / WidgetSkeleton |

## Component contracts

```ts
// Dialogs
<ConfirmReasonDialog open onOpenChange title confirmLabel minLength={10} onConfirm={(reason) => ...} pending? />

// Notifications
<NotificationList items={[{ id, title, body, href, readAt, createdAt }]} />
<NotificationBadge count={number} />

// Upload
<FileUploadField accept maxBytes={25_000_000} onUploaded={(meta) => ...} scanStatus? />

// Payments
<PaymentStatusBadge status={PaymentStatus} />
<PaymentCheckoutPanel obligation={{ amountCents, currency, description }} onPay={() => ...} />

// Feedback
<EmptyState title description? />
<ErrorState title description? onRetry? />
<ListSkeleton rows? />
```

## Visual tokens

Use existing design tokens (`text-primary`, `med-green`, `warm-coral`, `surface-container-*`, `font-headline`). Do not introduce a new palette.

## Localization

All user-visible strings via `next-intl` namespace `platform.*` (and existing portal keys during migration). Arabic RTL preserved on shared chrome.

## Accessibility

- Dialogs: focus trap, Esc closes, labelled reason field
- Icon-only actions: `aria-label`
- Loading: `aria-busy`
- Errors: not color-only

## Out of scope

- New marketing pages
- Redesign of portal shells
- Pixel changes “for consistency” that diverge from Stitch

Full review findings: [ui-review.md](../ui-review.md).
