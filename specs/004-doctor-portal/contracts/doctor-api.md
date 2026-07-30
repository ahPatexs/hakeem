# Contract: Doctor Portal API (Server Actions & Routes)

**Feature**: `004-doctor-portal` | **Date**: 2026-07-30

Primary mutations: **Server Actions** + Zod. Streaming: Route Handlers. All require `DOCTOR` session + linked `doctorProfileId` unless noted. Anti-enumeration: foreign resources → `NOT_FOUND`.

## Conventions

- Errors: `{ ok: false, code: string }`
- Success: `{ ok: true, data?: … }`
- Lists: `{ items, page, pageSize, total }` (`pageSize` default 20)
- Optimistic concurrency: clients send `updatedAt` or `version` on draft saves → `CONFLICT` if stale

## Error catalog

| Code | Meaning |
|------|---------|
| UNAUTHENTICATED | No session |
| FORBIDDEN | Not DOCTOR |
| DOCTOR_PROFILE_UNLINKED | User missing doctorProfileId |
| NOT_FOUND | Missing or no care relationship |
| VALIDATION_ERROR | Zod/business field errors |
| ALREADY_IN_PROGRESS | Second concurrent visit start blocked |
| INVALID_STATUS | Lifecycle transition not allowed |
| SIGN_REQUIREMENTS | SOAP/summary missing required sections |
| ALLERGY_BLOCK | Hard allergy match — sign blocked |
| SAFETY_ACK_REQUIRED | Interaction or missing-allergy ack needed |
| JOIN_WINDOW_CLOSED | Video join not allowed now |
| RATE_LIMITED | AI throttle (30/hour) |
| CONFLICT | Stale draft version |
| OFFLINE | Client-side connectivity (UI); server returns standard errors |

## Server Actions (representative)

### Context
- `getDoctorContext()` → `{ userId, doctorId, displayName, timezone }`

### Dashboard
- `getDashboard()` → widget bundle with per-widget ok/error isolation

### Schedule / appointments / queue
- `getTodaySchedule()`
- `listUpcoming({ page?, from?, to?, status? })`
- `getAppointment({ id })`
- `getPatientQueue()`
- `startConsultation({ appointmentId })`
- `completeConsultation({ appointmentId })`
- `markNoShow({ appointmentId, reason? })`

### Patients
- `getPatientDetails({ patientId })` — care relationship required
- `listRecentPatients({ limit? })`

### Workspace
- `getConsultationWorkspace({ appointmentId })`

### SOAP / Summary
- `getSoapNote({ appointmentId })`
- `saveSoapDraft({ appointmentId, subjective, objective, assessment, plan, updatedAt })`
- `finalizeSoap({ appointmentId })` — Review & Sign
- `amendSoap({ appointmentId, …fields, reason })`
- `dismissSoap({ appointmentId, reason })`
- Parallel actions for Clinical Summary (`saveSummaryDraft`, `finalizeSummary`, …)

### Prescriptions
- `createPrescriptionDraft({ patientId, appointmentId?, lines[] })`
- `updatePrescriptionDraft({ id, lines[], updatedAt })`
- `getPrescriptionForReview({ id })`
- `signPrescription({ id, interactionAck?, allergyDataUnavailableAck? })`
- `listDoctorPrescriptions({ page?, status? })`

### Records / Labs
- `listPatientMedicalRecords({ patientId, page?, q?, from?, to? })`
- `getMedicalRecord({ id })`
- `listPatientLabs({ patientId, page? })` — Preliminary + Final
- `getLabResult({ id })`
- `markLabReviewed({ labResultId })`

### Notifications / profile / settings
- `listNotifications({ page? })`
- `markNotificationRead({ id })` / `markAllNotificationsRead()`
- `dismissNotification({ id })`
- `updateDoctorProfile(input)`
- `updateDoctorSettings(input)`

### AI
- `ensureDoctorAiConversation({ mode, patientId?, appointmentId? })`
- `acceptAiDocumentation({ conversationId, messageId, target: 'soap'\|'summary' })`
- `acceptAiPrescriptionLines({ conversationId, messageId, prescriptionId? })`
- Streaming chat via Route Handler

### Video
- `getDoctorVideoSession({ appointmentId })` → `{ token/url, role: 'host' }`
- `admitVideoPatient({ appointmentId })` when supported

## Route Handlers

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/doctor/ai/chat` | Stream AI; CSRF + auth + rate limit |
| GET | `/api/doctor/documents/[id]` | PHI document bytes; care relationship + audit |
| POST | `/api/doctor/video/session` | Optional token mint if not via action |

## Audit

Successful sensitive actions emit `SecurityAuditEvent` per [data-model.md](../data-model.md) catalog. Denials for chart access also audited.
