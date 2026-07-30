# Contract: Patient Portal API (Server Actions & Routes)

**Feature**: `003-patient-portal` | **Date**: 2026-07-29

Primary mutations: **Server Actions** with Zod. Streaming/webhooks: Route Handlers. All require `PATIENT` session unless noted. Responses never include other patients’ data or stack traces.

## Conventions

- Errors: `{ ok: false, code: string }` using catalog below
- Success: `{ ok: true, data?: … }`
- List queries: `{ items, page, pageSize, total }` with `pageSize` default 20
- IDs: opaque cuid; cross-patient → `NOT_FOUND`

## Error catalog

| Code | Meaning |
|------|---------|
| UNAUTHENTICATED | No session |
| FORBIDDEN | Not PATIENT / denied |
| NOT_FOUND | Missing or not owned |
| VALIDATION_ERROR | Zod/business field errors |
| HOLD_EXPIRED | Booking hold timed out |
| SLOT_UNAVAILABLE | Doctor slot taken |
| CANCEL_WINDOW_CLOSED | Inside 12h restriction |
| JOIN_WINDOW_CLOSED | Video join not allowed now |
| UPLOAD_REJECTED | Type/size/scan/count |
| PAYMENT_FAILED | Provider failure |
| PAYMENT_CONFLICT | Obligation already Paid |
| RATE_LIMITED | AI or action throttle |
| OFFLINE / CONFLICT | Connectivity / version conflict |
| LAB_NOT_RELEASED | Lab not visible to patient |

## Server Actions (representative)

### Dashboard
- `getDashboard()` → widget DTO bundle (partial errors per widget allowed in structured form)

### Profile / Medical profile / Settings
- `updatePatientProfile(input)`
- `updateMedicalProfile(input)`
- `updatePortalSettings(input)`

### Doctors
- `searchDoctors({ q?, specialty?, page? })`
- `getDoctor(slug)`

### Appointments
- `holdAppointmentSlot({ doctorId, startAt, endAt, mode, reason? })` → `{ appointmentId, holdExpiresAt }`
- `confirmAppointment({ appointmentId })`
- `cancelAppointment({ appointmentId, reason? })`
- `rescheduleAppointment({ appointmentId, doctorId, startAt, endAt })`
- `listUpcoming({ page? })` / `listHistory({ page?, status?, from?, to? })`
- `getAppointment({ id })`

### Video
- `getVideoJoinSession({ appointmentId })` → `{ token/url, expiresAt }` or error `JOIN_WINDOW_CLOSED`

### Records / Labs / Prescriptions
- `listMedicalRecords({ q?, from?, to?, page? })`
- `getMedicalRecord({ id })`
- `listLabResults({ … })` — server filters RELEASED only
- `getLabResult({ id })`
- `listPrescriptions({ scope: 'active' \| 'history', page? })`
- `getPrescription({ id })`

### Payments
- `listPayments({ status?, page? })`
- `createPaymentIntent({ obligationId })` → client secret / redirect
- `getPayment({ id })`

### Notifications
- `listNotifications({ page? })`
- `markNotificationRead({ id })` / `markAllNotificationsRead()`
- `dismissNotification({ id })`

### AI
- Prefer Route Handler stream; action `ensureAiConversation()` → `{ conversationId }`

## Route Handlers

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/patient/uploads` | PATIENT + CSRF | Multipart upload |
| GET | `/api/patient/documents/[id]` | PATIENT + ownership | Stream file (`no-store`) |
| POST | `/api/patient/ai/chat` | PATIENT + CSRF | Stream assistant tokens |
| POST | `/api/patient/payments/webhook` | Provider signature | Mark Paid/Failed |

## Localization

User-facing strings via `next-intl` `patient.*` namespaces; actions return codes mapped in UI.
