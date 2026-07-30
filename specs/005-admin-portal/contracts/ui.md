# Contract: Administration Portal UI (Stitch)

**Feature**: `005-admin-portal` | **Date**: 2026-07-30

Approved **Stitch** screens (project `2408493713147971043`) are the single UI source of truth. **Do not invent alternate IA or visual language.**

## Shell

| Region | Must include (per Stitch) | Implementation target |
|--------|---------------------------|------------------------|
| Sidebar | Logo, primary admin nav | `AdminSidebar` + `AdminNav` |
| Header | Notifications bell (+ badge), admin identity, locale | `AdminHeader` |
| Main | Page title + content | route `children` |

Marketing `Navbar`/`Footer` MUST NOT appear on `/admin/*`.

## Screen → route map

| Stitch surface | Screen id | Route | Primary components |
|----------------|-----------|-------|--------------------|
| Admin Dashboard - Hakeem Platform Control | `2021a1fce3214dcdb7166930e4dc2c7b` | `/admin` | `DashboardGrid`, `KpiCard`, `QuickActionsBar` |
| User Management - Hakeem Admin | `dbb65fd3ed5d472a86eefdb9d6e6f750` | `/admin/users` | `UserTable`, `ConfirmReasonDialog` |
| Doctor Management - Hakeem Admin | `957069ed6b0a45af9b7d654be61eae82` | `/admin/doctors` | `DoctorQueue`, `DoctorTable` |
| Appointment Management / Dashboard - Hakeem | `6640999033b747e292dc65ea54e533b5` (+ related) | `/admin/appointments` | `AppointmentOpsTable` |
| AI Operations & Platform Health - Hakeem Admin | `ad8436f648ed41f18b5c8588249372c5` | `/admin/ai` (+ health links) | `AiOpsPanel`, toggles |
| Billing & Transactions - Hakeem | `58eef7a7942a42e1badc0691b45c7a8f` | `/admin/billing` | `TransactionTable` |
| Payment & Revenue Management - Hakeem Admin | `3a2b410376554f0782356d493a8b1b9b` | `/admin/revenue` | `RevenueSummary` |
| Executive / Appointment / Revenue / AI Analytics | `3372208087d948b6a3a74d513f6b53d1`, `be57c8e542fe462b8e295206bb6faa5a`, `2d767e28024640e896faf950de80d1fa`, `52d7fbeab5f6419bb61ef54ecfd86d77` | `/admin/analytics/*` | `AnalyticsCharts`, `ExportButton` |
| Platform Settings - Hakeem Admin | `6fe9b62f9d6d49f2a1852e475558f326` | `/admin/settings` | `SettingsForm` |
| System Health & Audit Logs - Hakeem Admin | `d428b14b7f044ff5a71f1e6590733fe3` | `/admin/health` + `/admin/audit` | `HealthPanel`, `AuditTable` (tabs OK if Stitch is combined) |
| Notification Center / Details / All Caught Up / Preferences | `58b2271654e94d33a5b9744b776ead8f`, `bc1f73a5109845bba71e9de93356a403`, `f9cd867d207b433ba675a565340166b6`, `d9ea3cd026074b928d24670daa3df05f` | `/admin/notifications` | `NotificationCenter` |
| *(No dedicated Stitch title)* Role & Permission Management | — | `/admin/roles` | Adapt Platform Settings / User Management patterns; **do not invent new chrome** |

## Mandatory UI states (every list/widget)

| State | Requirement |
|-------|-------------|
| Loading | Skeleton matching Stitch density |
| Empty | Title + hint + CTA (Notifications: use **All Caught Up** pattern) |
| Error | Safe message + retry; no stack/PHI leak |
| Confirm | Reason dialog for suspend/reject/refund/AI disable |

## Accessibility & i18n

- Keyboard reachability for primary actions; visible focus; labeled icon buttons.
- EN + AR catalogs; RTL mirrored chrome.
- WCAG 2.2 AA target for primary flows within Stitch constraints.

## Responsive

- Stitch assets are **DESKTOP (2560)**. Implementation MUST adapt to tablet/mobile using existing Hakeem breakpoints (collapse sidebar to drawer, stack KPI grids)—**without redesigning** components or inventing new layouts.

## Design pack gate

Pixel implementation requires files under `specs/005-admin-portal/design/` (see [ui-review.md](../ui-review.md)). Until exported, structure routes/components against this map using Hakeem tokens only as interim—not a redesign.
