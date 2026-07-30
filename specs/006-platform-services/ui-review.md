# UI Review: Shared Platform Surfaces (Stitch)

**Date**: 2026-07-30 | **Feature**: `006-platform-services`  
**Stitch project**: `2408493713147971043`  
**Directive**: Do **not** redesign. Approved Stitch is SoT where screens exist.

## Review method

1. Attempted Stitch MCP `list_screens` for project `2408493713147971043` — **401 (auth expired)** at plan time.
2. Fell back to local design packs + live component inventory:
   - `specs/001-public-website/design/manifest.json`
   - `specs/003-patient-portal/design/`
   - `specs/004-doctor-portal/design/manifest.json`
   - `specs/005-admin-portal/design/manifest.json` (admin notifications, billing, settings)
3. Mapped required shared surfaces to existing code under `src/components/{ui,patient,doctor,admin}/shared`.

**Follow-up**: When Stitch OAuth is restored, re-export shared dialog/notification/upload/payment frames into `specs/006-platform-services/design/` and attach filenames in a manifest (same pattern as Module 4).

## Validation matrix

| Surface | Stitch / design expectation | Current codebase | Plan action | Redesign? |
|---------|----------------------------|------------------|-------------|-----------|
| Shared dialogs | Modal, clear title, primary/secondary, reason field for destructive | `components/ui/dialog.tsx`, `admin/shared/confirm-reason-dialog.tsx`, patient/doctor confirms | Promote to `components/platform/dialogs` + re-export; keep visuals | **No** |
| Shared notifications | List, unread, mark read, deep link | `patient/notifications/*`, `doctor/notifications/*`, `admin/notifications/*` | Shared `NotificationList` / badge primitive; portals thin wrappers | **No** |
| Shared upload | File picker/dropzone, progress, status | Patient records upload flows + `PatientUpload` | `FileUploadField` in platform wrapping StoragePort + scan badge | **No** |
| Shared payment | Amount SAR, status, checkout CTA | `patient/payments/*`, admin billing badges | `PaymentStatusBadge` + checkout panel; Stitch payment confirmation layout | **No** |
| Empty states | Short empty copy | `admin/shared/empty-state.tsx` (+ portal equivalents) | Single `platform/empty-state` | **No** |
| Error states | Safe error + retry | `admin/shared/error-state.tsx` | Single `platform/error-state` | **No** |
| Loading states | Skeleton / pulse | `admin/shared/list-skeleton.tsx`, portal loaders | Single `platform/loading-state` | **No** |

## Findings

1. **Duplication, not divergence**: Empty/error/skeleton patterns already match the same token language; Module 5 consolidates imports rather than inventing new chrome.
2. **Admin ConfirmReasonDialog** is the strongest shared dialog reference (labelled reason, min length)—reuse for platform destructive flows.
3. **Payment UI** must remain Patient/Admin Stitch-aligned; platform only extracts badge + checkout shell, not a new payments microsite.
4. **Upload** must show PENDING scan without exposing storage keys/URLs in the UI.
5. **Notification deep links** already required by Admin FR; shared list must render `href` (done in Admin; extend to platform primitive).

## Gaps (implementation, not redesign)

- No `components/platform/*` package yet — create by move/re-export.
- No Module 5 `design/` PNG pack yet (blocked on Stitch auth) — track in tasks.
- Push UI not in Stitch as a primary screen — device registration can be settings-only / headless until design exists.

## Sign-off criteria for implement

- [ ] Pixel/token match vs Stitch screenshots when pack available
- [ ] No new color system or typography stack
- [ ] Portal shells unchanged except importing platform primitives
- [ ] a11y: dialog labels, aria-busy skeletons, non-color-only status

## Conclusion

Shared UI work for Module 5 is **consolidation under Stitch-compatible existing patterns**. No redesign approved or planned.
