# Research: Doctor Portal & Clinical Workspace

**Date**: 2026-07-30 | **Plan**: [plan.md](./plan.md)

Mandated stack: Next.js 15 App Router, TypeScript strict, Tailwind, shadcn/ui, React Query, Prisma, Neon, Zod, Server Actions. Research applies clarified doctor-portal spec onto Module 1 auth + Module 2 clinical tables.

## D1. Server Components vs React Query

- **Decision**: RSC + Server Actions for dashboard, schedule, queue, chart, SOAP/Rx mutations; React Query only for AI streaming, optional notification badge polling, and video session client state.
- **Rationale**: PHI defaults to server-owned fetch (`no-store`); matches patient-portal pattern; cookie mutation stays in actions/route handlers (not RSC `auth()`).
- **Alternatives considered**: Full SPA React Query (PHI cache risk); RSC-only AI streaming (poor DX).

## D2. Doctor identity bridge (CMS Doctor ↔ User)

- **Decision**: Require `User.doctorProfileId → Doctor.id` for portal access to schedule/queue; resolve `doctorId` from session once in `requireDoctorContext()`; refuse portal clinical ops if link missing (`DOCTOR_PROFILE_UNLINKED`).
- **Rationale**: Appointments already key off CMS `Doctor.id`; avoids duplicating clinician table.
- **Alternatives considered**: Parallel `DoctorUser` table (drift); match by email only (fragile).

## D3. Care relationship authorization

- **Decision**: Domain helper `assertCareRelationship(doctorId, patientUserId)`: true if any appointment assigned to this doctor for patient within 24 months, or active `DoctorPatientPanel` row (optional v1 table). Deny → generic `NOT_FOUND`.
- **Rationale**: Spec FR-010 / HIPAA minimum necessary; anti-enumeration.
- **Alternatives considered**: Open patient search (rejected); break-glass (out of v1).

## D4. Consultation lifecycle & single In-progress

- **Decision**: Extend `AppointmentStatus` with `CHECKED_IN` (Waiting maps to it); enforce ≤1 `IN_PROGRESS` per `doctorId` via transactional check; `completeVisit` → `COMPLETED` without requiring signed SOAP; pending notes query drafts where `appointment.status=COMPLETED` and note not FINAL.
- **Rationale**: Clarified throughput + documentation quality via pending notes.
- **Alternatives considered**: Soft multi-visit (confusion); hard-block complete without SOAP (clinic bottleneck).

## D5. SOAP / Clinical Summary versioning

- **Decision**: `SoapNote` + `ClinicalSummary` tables with `version`, `status DRAFT|FINAL`, `parentVersionId`, `contentHash`, `signedAt`, `signerUserId`, `amendmentReason`, `lateAmendment` flag; edits to FINAL create new row not UPDATE-in-place.
- **Rationale**: Spec immutability + late amendment >72h.
- **Alternatives considered**: JSON history column (weaker queries); only soft-delete (loses attribution clarity).

## D6. Digital signature (v1)

- **Decision**: Review & Sign Server Action under authenticated session; persist attestation fields on artifact; no step-up MFA/PKI in v1; AI paths never call sign actions.
- **Rationale**: Clarified electronic clinician attestation.
- **Alternatives considered**: WebAuthn step-up (defer); external e-sign vendor (ops/BAA delay).

## D7. Prescription draft → sign release

- **Decision**: Extend `Prescription` with `status` including `DRAFT`, line-item child `PrescriptionLine`, safety ack fields, `signedAt`/`signerUserId`; patient portal lists exclude `DRAFT`; sign transitions to `ACTIVE`.
- **Rationale**: Spec FR-016/017; patient module currently assumes ACTIVE-only authored rows.
- **Alternatives considered**: Separate DraftPrescription table (join pain); sign-on-create (skips review).

## D8. Allergy / interaction checks

- **Decision**: `SafetyCheckPort` with v1 adapter reading `MedicalProfile.allergies` + simple string/class match; hard block on match; interaction stub returns empty or low-confidence warnings until formulary vendor wired.
- **Rationale**: Spec requires block on hard allergy; incomplete coding must warn—not invent certainty.
- **Alternatives considered**: Full drug DB day-one (scope); no checks (unsafe).

## D9. AI clinical assistants

- **Decision**: Reuse `AiAssistantPort` with doctor-scoped conversations (`DoctorAiConversation`); three modes: medical Q&A, documentation draft, prescription suggest; rate limit 30/hour/doctor; Accept copies into draft SOAP/Rx only; retention ≤12 months.
- **Rationale**: Spec FR-018/019; separates patient AI threads.
- **Alternatives considered**: Shared AiConversation with role column (easy cross-leak); client-side LLM keys (secret leak).

## D10. Telemedicine (doctor host)

- **Decision**: Same `TelemedicinePort` as patient module; doctor join claims host; admit API when provider supports waiting room; join window domain shared `canJoinVideo`.
- **Rationale**: Spec alignment with patient portal; single vendor BAA.
- **Alternatives considered**: Separate doctor-only video stack (duplicate cost).

## D11. Notifications for doctors

- **Decision**: Generalize notifications to `recipientUserId` (migrate from `patientUserId`) or add `DoctorNotification` mirror; prefer single `Notification` with `recipientUserId` + category enum extended for doctor triggers.
- **Rationale**: Spec FR-023; avoid two notification systems.
- **Alternatives considered**: Email-only for doctors (fails in-portal primary).

## D12. Labs visibility (doctor vs patient)

- **Decision**: Doctor loaders return `PRELIMINARY` + `FINAL` for care-relationship patients; patient loaders remain `RELEASED` only; optional `LabReviewAcknowledgement` table.
- **Rationale**: Clarified asymmetric visibility.
- **Alternatives considered**: Same filter both portals (wrong clinically).

## D13. Caching PHI

- **Decision**: `no-store` for all doctor clinical responses; no ISR on chart/SOAP/Rx; short private cache only for non-PHI static chrome assets.
- **Rationale**: HIPAA-ready; stale PHI risk.
- **Alternatives considered**: Edge cache dashboard (unsafe).

## D14. Performance

- **Decision**: Dashboard `Promise.allSettled` widget loaders; indexes on `(doctorId, startAt, status)`, `(doctorId, status)` for in-progress uniqueness check; queue query `CHECKED_IN` ordered by `checkedInAt`.
- **Rationale**: SC-001/002; FR-008 single in-progress.
- **Alternatives considered**: One mega-join (fragile isolation).

## D15. Stitch design gate

- **Decision**: UI pixel tasks blocked until Stitch export lands in `specs/004-doctor-portal/design/`; MCP returned **401** during plan (same as Modules 1–2). Domain/API/Prisma may proceed; chrome must follow Stitch IA including inside top nav when assets available.
- **Rationale**: Spec FR-027; no redesign.
- **Alternatives considered**: Invent UI from patient shell (forbidden as SoT).

## D16. Portal shell / chrome

- **Decision**: `DoctorPortalShell` under `doctor/layout` with sidebar + **PortalHeader** (search, notifications, profile) per Stitch; hide marketing chrome via existing `PORTAL_SHELL_SEGMENTS` (`doctor` already included).
- **Rationale**: Spec FR-034; patient shell exists as pattern to mirror—not copy pixel-for-pixel until Stitch doctor pack is present.
- **Alternatives considered**: Reuse patient shell components with role prop (risk of wrong IA).

All Technical Context items resolved — no remaining NEEDS CLARIFICATION.
