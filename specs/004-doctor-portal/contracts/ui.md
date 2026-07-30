# Contract: Doctor Portal UI (Stitch)

**Feature**: `004-doctor-portal` | **Date**: 2026-07-30

Approved **Stitch** screens are the single UI source of truth. This contract maps product surfaces to implementation components—**do not invent alternate IA**.

## Shell

| Region | Must include (per Stitch) | Implementation target |
|--------|---------------------------|------------------------|
| Sidebar | Logo, primary nav (Dashboard, Appointments/Schedule, Queue, Patients/Records, Prescriptions, AI, Settings/Support as designed) | `DoctorSidebar` + `DoctorNav` |
| Inside top nav | Search, notifications bell (+ badge), doctor name/id/avatar | `DoctorHeader` |
| Main | Page title + content | route `children` |

Marketing `Navbar`/`Footer` MUST NOT appear on `/doctor/*`.

## Screen → route map

| Stitch surface | Route | Primary components |
|----------------|-------|--------------------|
| Doctor Dashboard | `/doctor` | `DashboardGrid`, widgets, `QuickActions` |
| Today's Schedule | `/doctor/schedule` | `ScheduleList` |
| Upcoming Appointments | `/doctor/appointments/upcoming` | `AppointmentList` |
| Patient Queue | `/doctor/queue` | `QueueList` |
| Patient Details | `/doctor/patients/[patientId]` | `PatientChartSummary`, `AllergyBanner` |
| Consultation Workspace | `/doctor/consultations/[appointmentId]` | `WorkspaceShell` |
| SOAP Notes | `…/soap` | `SoapEditor`, `ConfirmSignDialog` |
| Clinical Summary | `…/summary` | `SummaryEditor` |
| AI Medical Assistant | `/doctor/ai` | `AiChatPanel` |
| AI Clinical Documentation | `/doctor/ai/documentation` | `AiDocumentationPanel` |
| AI Prescription Assistant | `/doctor/ai/prescription` | `AiPrescriptionPanel` |
| Create Prescription | `/doctor/prescriptions/new` | `PrescriptionForm` |
| Review & Sign Prescription | `/doctor/prescriptions/[id]` | `PrescriptionReviewSign` |
| Medical Records | `/doctor/patients/[id]/records` | `RecordsList`, `DocumentViewer` |
| Lab Results & Imaging | `/doctor/patients/[id]/labs` | `LabsList`, critical banner |
| Video Consultation | `…/video` | `VideoHostRoom` |
| Notifications | `/doctor/notifications` | `NotificationCenter` |
| Doctor Profile | `/doctor/profile` | `DoctorProfileForm` |
| Settings | `/doctor/settings` | `DoctorSettingsForm` |

## Mandatory UI states (every list/widget)

| State | Requirement |
|-------|-------------|
| Loading | Skeleton matching Stitch density (no layout jump if possible) |
| Empty | Title + hint + primary CTA |
| Error | Safe message + retry; no stack/PHI leak |
| Offline | Banner; disable Start/Complete/Sign/Finalize |

## Accessibility & i18n

- Keyboard reachability for primary actions; visible focus; labeled icon buttons.
- EN + AR message catalogs; RTL mirrored chrome.
- WCAG 2.2 AA target for primary flows within Stitch constraints.

## Design pack gate

Pixel implementation requires files under `specs/004-doctor-portal/design/` (see [ui-review.md](../ui-review.md)). Until then, structure routes/components against this map using existing Hakeem tokens only as interim—not a redesign.
