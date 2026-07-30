# Contract: Patient Portal UI (Stitch)

**Feature**: `003-patient-portal` | **Date**: 2026-07-29

Stitch is the **single source of truth** for layout, typography, color, spacing, and component composition. This contract lists required screens and UX states; pixel implementation follows exported design assets in `../design/`.

## Required screens

| Screen | Route | Must include |
|--------|-------|--------------|
| Dashboard | `/patient` | Welcome, widgets (caps per spec), quick actions |
| Profile | `/patient/profile` | View/edit + upload affordances if designed |
| Medical profile | `/patient/medical-profile` | Sections + empty prompts |
| Settings | `/patient/settings` | Language + notification toggles |
| Find doctors | `/patient/doctors` | Search, specialty filter, list, pagination |
| Doctor detail / book | `/patient/doctors/[slug]`, `/patient/appointments/book` | Slots, mode, confirm |
| Upcoming | `/patient/appointments/upcoming` | List, actions |
| History | `/patient/appointments/history` | Filters |
| Appointment detail | `/patient/appointments/[id]` | Cancel/reschedule/join per rules |
| Video consultation | `/patient/consultations/[id]` | Pre-join, waiting, in-call, errors |
| Medical records | `/patient/records`, `/[id]` | List + viewer |
| Labs | `/patient/labs`, `/[id]` | Released only + phase labels |
| Prescriptions | `/patient/prescriptions` | Active/history |
| Payments | `/patient/payments` | Outstanding + history |
| Notifications | `/patient/notifications` | Badge, read, dismiss |
| AI assistant | `/patient/ai` | Disclaimer, thread, composer |

## Mandatory UI states (every list/widget)

- **Loading**: skeleton matching Stitch structure (no layout jump)
- **Empty**: message + primary CTA
- **Error**: safe copy + retry
- **Offline**: block destructive submits; reconnect hint

## Accessibility & i18n

- WCAG 2.2 AA for interactive flows
- EN + AR with RTL mirroring per Stitch
- Focus order follows visual order; icon-only controls have accessible names

## Reuse rules

- Shared `EmptyState` / `ErrorState` / `Pagination` / `DocumentViewer` must match Stitch variants — do not invent alternate visual languages
- Prefer existing shadcn primitives styled to tokens; do not add decorative card chrome absent from Stitch

## Gate

UI coding tasks require `design/manifest.json` + screen PNGs/HTML export. Until then, backend/domain may proceed; UI tasks stay blocked (see [ui-review.md](../ui-review.md)).
