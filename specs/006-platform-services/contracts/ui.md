# Contract: Shared Platform UI (Stitch-aligned)

**Feature**: `006-platform-services` | **Date**: 2026-07-30  
**Stitch project**: `2408493713147971043`  
**Rule**: Do **not** redesign. Match approved screens; consolidate duplicated portal primitives into `components/platform`.

## Surfaces in scope

| Surface | Stitch reference | Expected behavior |
|---------|------------------|-------------------|
| Shared dialogs | Embedded in flows + ConfirmReasonDialog | Modal overlay, title, description, primary/secondary; reason textarea min 10 where destructive |
| Shared notifications | Notification Center / Details / All Caught Up | List rows, unread emphasis, mark read, optional deep link; empty state copy from All Caught Up |
| Shared upload | Prescriptions & Documents / Lab & Radiology | Dropzone/button, filename, progress, PENDING scan, rejection message; no public URL display |
| Shared payment | Secure Checkout / Payment Status / Successful | Amount/currency SAR, status badge, pay CTA / processing / success-failure; intent client secret or redirect only |
| Empty states | All Caught Up + portal empties | Short title + optional hint; no decorative card spam |
| Error states | Access Denied + portal ErrorState | Safe message + retry when applicable |
| Loading states | In-flow skeletons | Skeleton / aria-busy |
| Shared video components | Waiting Room + Video Consultation | Waiting room, camera preview, device selector, participant grid, call controls (audio/video/screen/chat), session shell |
| Shared AI components | AI Consultation / Prescription Stitch | Shell + disclaimer chrome only; portals own clinical actions |

Full mapping: [ui-review.md](../ui-review.md).

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

// Video (shared — Patient + Doctor)
<VideoWaitingRoom appointmentId role="patient" | "doctor" onReady={() => ...} />
<CameraPreview />
<DeviceSelector onChange={(devices) => ...} />
<ParticipantGrid />
<CallControls enableScreenShare enableInCallChat />
<VideoSessionShell appointmentId role />  // connects with platform JWT; handles recovery

// AI (shared chrome)
<AiAssistantShell feature="patient" | "doctorDocumentation" | "doctorPrescription" children />

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
