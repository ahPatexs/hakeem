# UI Review: Shared Platform Surfaces (Stitch)

**Date**: 2026-07-30 (refreshed) | **Feature**: `006-platform-services`  
**Stitch project**: `2408493713147971043` (`Hakeem AI Healthcare Landing Page`)  
**Directive**: Do **not** redesign. Approved Stitch is SoT where screens exist.

## Review method

1. Stitch MCP `list_screens` for project `2408493713147971043` — **succeeded** (auth restored; ~96 entries including product screens + asset frames).
2. Mapped required shared surfaces to Stitch screen titles/ids below.
3. Confirmed live code under `src/components/platform/*` consolidates portal primitives (dialogs, notifications, upload, payment badge, empty/error/loading) — **no new visual language**.

**PNG pack**: `design/manifest.json` may still show `exported: false` until optional screenshot export for pixel QA. Implementation must match Stitch + existing tokens regardless.

## Stitch sources for shared surfaces

| Surface | Stitch screen (title) | Screen id (suffix) |
|---------|----------------------|--------------------|
| Shared notifications (list) | Notification Center - Hakeem | `…/58b2271654e94d33a5b9744b776ead8f` |
| Shared notifications (detail) | Notification Details - Hakeem | `…/bc1f73a5109845bba71e9de93356a403` |
| Shared notifications (empty) | All Caught Up - Hakeem Notifications | `…/f9cd867d207b433ba675a565340166b6` |
| Notification prefs (portal, not redesign) | Notification Preferences - Hakeem | `…/d9ea3cd026074b928d24670daa3df05f` |
| Shared payment checkout | Secure Checkout - Hakeem | `…/baccb518b56e49e086747e71e82b8d29` |
| Shared payment status | Payment Status - Hakeem | `…/5d6ca3aa9af348519e002592be6ed3d8` |
| Shared payment success | Payment Successful - Hakeem | `…/481ec39d22eb4e35b7a11c6e901e1c89` |
| Payment dashboards (consume badge) | Payment Dashboard / Billing & Transactions / Admin Payment & Revenue | multiple |
| Shared upload / documents | Prescriptions & Documents - Hakeem | `…/10acb5ff2d9143319d6ac0882486efd8` |
| Related medical files chrome | Lab Results & Radiology - Hakeem EMR | `…/d5cb724385e54f55a36856880f89837b` |
| Error / access denied patterns | Access Denied - Hakeem (Biometric Edition) | `…/119394faa8734017a641c111fc16a38e` |
| Video waiting (session chrome) | Waiting Room - Hakeem Video Consultation | `…/67bd1790016743d8a85f9606c00d31f7` |
| Video consultation workspace | Video Consultation / Consultation Workspace | in-project Stitch frames |
| Shared AI chrome | AI Consultation Workspace / Prescription Draft surfaces | in-project Stitch AI frames |

## Stitch / shared UI — Video & AI validation (plan extension)

| Surface | Stitch / design expectation | Platform ownership | Redesign? |
|---------|----------------------------|--------------------|-----------|
| Shared Video Components | LiveKit React Components wrapped in platform chrome | `components/platform/video/*` | **No** |
| Video Waiting Room | Waiting Room - Hakeem Video Consultation | `video/waiting-room.tsx` | **No** |
| Camera Preview | Pre-join local preview | `video/camera-preview.tsx` | **No** |
| Device Selector | Mic/camera/speaker picker | `video/device-selector.tsx` | **No** |
| Participant Grid | Local/remote tiles during call | `video/participant-grid.tsx` | **No** |
| Call controls (audio/video/screen/chat) | In-call toolbar on Video Consultation workspace | `video/call-controls.tsx` | **No** |
| Shared AI Components | AI Consultation / Prescription Stitch shells | `components/platform/ai/*` | **No** |

**Consumer rule**: Patient and Doctor portals import these shared components only. LiveKit Server SDK, JWT minting, room create/close, and egress stay in `adapters/livekit-telemedicine` + `lib/platform/video`. Admin uses analytics/call-log views, not a parallel LiveKit client.

Dialogs, loading skeletons, and generic empty/error chrome are **component-level** in Stitch (embedded in the screens above) plus existing shadcn `Dialog` — not standalone Stitch “EmptyState” frames. Consolidate to `components/platform` using those screen patterns and current tokens.

## Validation matrix

| Surface | Stitch / design expectation | Current codebase | Plan action | Redesign? |
|---------|----------------------------|------------------|-------------|-----------|
| Shared dialogs | Modal, title, primary/secondary; reason ≥10 for destructive | `components/platform/dialogs/confirm-reason-dialog.tsx` | Keep; portals import platform | **No** |
| Shared notifications | List, unread, mark read, deep link; empty “All Caught Up” | `components/platform/notifications/notification-list.tsx` | Match Stitch Notification Center/Details/Empty | **No** |
| Shared upload | File picker/dropzone, progress, PENDING scan | `components/platform/upload/file-upload-field.tsx` | Align with Documents / Lab upload affordances | **No** |
| Shared payment | Amount SAR, status, checkout CTA / success | `components/platform/payments/payment-status-badge.tsx` (+ portal checkout shells) | Match Secure Checkout / Status / Successful | **No** |
| Empty states | Short empty copy | `components/platform/empty-state.tsx` | Tokens only; copy from Stitch empties | **No** |
| Error states | Safe error + retry / access denied | `components/platform/error-state.tsx` | Safe messaging; Auth Access Denied for authz pages | **No** |
| Loading states | Skeleton / pulse | `components/platform/loading-state.tsx` | Existing skeleton patterns | **No** |
| Shared video suite | Waiting room, preview, devices, grid, controls | `components/platform/video/*` (to complete LiveKit wrap) | Match Stitch Waiting Room + Video Consultation | **No** |
| Shared AI components | Assistant shell / disclaimer chrome | `components/platform/ai/*` | Match Stitch AI workspaces; no new AI visual system | **No** |

## Findings

1. **Duplication, not divergence**: Platform kit already exists; work is consume-from-platform, not invent chrome.
2. **Notification empty state** has an explicit Stitch screen (“All Caught Up”) — use that copy/layout cues when wiring empty notification lists.
3. **Payment UI** spans Secure Checkout → Status → Successful; platform extracts badge + shared shell pieces only — Patient/Admin keep flow ownership.
4. **Upload** must show PENDING scan without exposing storage keys/URLs.
5. **No standalone Stitch “dialog library” screen** — dialogs live inside flows; ConfirmReasonDialog remains the shared destructive pattern.
6. **Do not redesign** portal shells, colors, or typography to “unify” beyond Stitch + existing tokens.
7. **Video**: Waiting Room + Video Consultation / Workspace frames are SoT for shared LiveKit UI wrappers; Patient/Doctor must not fork separate video UIs.
8. **AI**: Shared AI components are chrome/disclaimer/shell only — clinical actions remain in portal domain; visuals from Stitch AI screens.

## Gaps (implementation / ops — not redesign)

- Optional: export PNGs into `specs/006-platform-services/design/` for pixel QA and set `manifest.json` `exported: true`.
- Push device registration UI is settings-adjacent; no dedicated Stitch “push” frame required for v1 headless registration.
- Complete `components/platform/video/*` LiveKit wrappers + `components/platform/ai/*` shells if not yet present; migrate portal join buttons to shared session shell.
- Wire `adapters/livekit-telemedicine.ts` when `TELEMEDICINE_ADAPTER=livekit` (stub remains for CI).

## Sign-off criteria for implement

- [x] Stitch inventory mapped for notifications, payments, documents/upload, error patterns
- [x] Stitch inventory mapped for Waiting Room + video workspace; AI shared chrome called out
- [ ] Pixel/token check vs exported screenshots when pack available
- [x] No new color system or typography stack planned
- [x] Portal shells unchanged except importing platform primitives (incl. video/AI)
- [x] a11y: dialog labels, aria-busy skeletons, non-color-only status; video controls labelled
- [ ] No `livekit-server-sdk` imports under `src/components/patient` or `src/components/doctor`

## Conclusion

Shared UI for Module 5 is **consolidation under Stitch-approved existing patterns**, now including a full **Video Communication** component suite (LiveKit/WebRTC) and **shared AI chrome**. **No redesign approved or planned.**