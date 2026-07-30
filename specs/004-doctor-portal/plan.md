# Implementation Plan: Doctor Portal & Clinical Workspace

**Branch**: `004-doctor-portal` | **Date**: 2026-07-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-doctor-portal/spec.md`

## Summary

Build the authenticated **Doctor Portal** clinical workspace in the existing Next.js 15 app: dashboard, today’s schedule, upcoming appointments, patient queue, patient details, consultation workspace, SOAP notes, clinical summary, digital Review & Sign prescribing, AI medical/documentation/prescription assistants, medical records, lab/imaging review, video host join, notifications, profile/settings—scoped strictly to `DOCTOR` via Module 1 guards and care-relationship checks. Reuse Module 2 clinical tables (appointments, labs, records, prescriptions) with doctor-authoring extensions. UI must match **approved Stitch** (no redesign). Stack: App Router, TypeScript strict, Tailwind, shadcn/ui, React Query (client islands), Prisma + Neon, Zod, Server Actions.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), Node.js 20 LTS

**Primary Dependencies**: Next.js 15 (App Router, RSC, Server Actions, Route Handlers), Prisma 6.x, Zod, Tailwind CSS, shadcn/ui, `next-intl`, `@tanstack/react-query`, Module 1 `@/auth`, Module 2 clinical models, Vercel AI SDK / gateway behind `AiAssistantPort`, telemedicine adapter behind `TelemedicinePort`, `SafetyCheckPort` for allergy/interaction

**Storage**: Neon PostgreSQL via Prisma; private object storage for clinical attachments (reuse Module 2 document proxy pattern)

**Testing**: Vitest (lifecycle, care relationship, sign rules, join window, allergy block), Playwright (doctor journeys), authorization matrix (cross-doctor/patient denial)

**Target Platform**: Vercel + Neon; evergreen browsers; Stitch responsive breakpoints

**Project Type**: Web application (extend single Next.js app)

**Performance Goals**: Dashboard usable ≤30s post-login (SC-001); start consultation → workspace ≤10s (SC-002); Patient Details first content ≤3s (SC-008); widget p95 &lt; 500ms where practical

**Constraints**: Stitch SoT; DOCTOR-only; ≤1 In progress visit; HIPAA-ready (TLS, encryption at rest, ≥6y audit, no PHI in URLs/analytics); no offline-first PHI; EN/AR + RTL; AI never signs; hard allergy blocks sign

**Scale/Scope**: ~18–25 doctor routes × 2 locales; widget caps per clarifications; concurrent clinicians per org; SOAP/Rx version history per visit

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template — **PASS by default**. Discipline: single-app extension; reuse Module 1 auth + Module 2 clinical data; Server Actions + Zod; ports for AI/video/safety; no speculative microservices.

**Post-Phase 1 re-check**: New SOAP/summary/Rx draft/sign/panel/ack tables + doctor notifications generalization required by clarified spec — justified. External AI/video/safety behind ports — justified. **PASS**.

## Route Structure

Locale-prefixed App Router under `src/app/[locale]/doctor/`:

```text
/{locale}/doctor                              # Dashboard
/{locale}/doctor/schedule                     # Today's schedule
/{locale}/doctor/appointments                 # Upcoming (default)
/{locale}/doctor/appointments/upcoming
/{locale}/doctor/appointments/[id]            # Appointment detail / start
/{locale}/doctor/queue                        # Patient queue
/{locale}/doctor/patients/[patientId]         # Patient details (opaque id)
/{locale}/doctor/consultations/[appointmentId]# Consultation workspace
/{locale}/doctor/consultations/[appointmentId]/soap
/{locale}/doctor/consultations/[appointmentId]/summary
/{locale}/doctor/consultations/[appointmentId]/video
/{locale}/doctor/prescriptions/new            # Create (patient/appointment context via query)
/{locale}/doctor/prescriptions/[id]           # Review & Sign / detail
/{locale}/doctor/records                      # Entry: pick context or from patient
/{locale}/doctor/patients/[patientId]/records
/{locale}/doctor/patients/[patientId]/labs
/{locale}/doctor/ai                           # AI Medical Assistant
/{locale}/doctor/ai/documentation             # AI Clinical Documentation
/{locale}/doctor/ai/prescription              # AI Prescription Assistant
/{locale}/doctor/notifications
/{locale}/doctor/profile
/{locale}/doctor/settings
/{locale}/account/change-password             # Module 1
/{locale}/account/sessions                    # Module 1
```

**Layouts**: Extend existing `doctor/layout.tsx` (`RoleLayoutGate("DOCTOR")`) with `DoctorPortalShell` (sidebar + inside top nav per Stitch). Marketing chrome already hidden via `PORTAL_SHELL_SEGMENTS`.

**API Route Handlers**:

```text
/api/doctor/ai/chat                    # Streaming AI (auth + CSRF + rate limit)
/api/doctor/documents/[id]             # Authenticated document stream (care relationship)
/api/doctor/video/session              # Join/admit token mint (optional if action suffices)
```

## Folder Structure

```text
src/
├── app/[locale]/doctor/              # Routes + layout
├── actions/doctor/                    # Server Actions (Zod)
│   ├── _helpers.ts                    # withDoctor / requireDoctorContext
│   ├── dashboard.ts
│   ├── schedule.ts
│   ├── appointments.ts
│   ├── queue.ts
│   ├── patients.ts
│   ├── consultations.ts
│   ├── soap.ts
│   ├── clinical-summary.ts
│   ├── prescriptions.ts
│   ├── records.ts
│   ├── labs.ts
│   ├── notifications.ts
│   ├── profile.ts
│   ├── settings.ts
│   └── ai.ts
├── components/doctor/
│   ├── shell/                         # DoctorPortalShell, DoctorSidebar, DoctorHeader (top nav)
│   ├── dashboard/
│   ├── schedule/
│   ├── queue/
│   ├── patients/
│   ├── workspace/                     # Consultation chrome
│   ├── soap/
│   ├── summary/
│   ├── prescriptions/
│   ├── records/
│   ├── labs/
│   ├── video/
│   ├── ai/
│   ├── notifications/
│   ├── profile/
│   ├── settings/
│   └── shared/                        # Empty/Error/Skeleton/Pagination/StatusBadge/ConfirmSign
├── domain/doctor/
│   ├── care-relationship.ts
│   ├── consultation.ts                # start/complete/no-show, single in-progress
│   ├── soap.ts                        # finalize rules, amendment/late
│   ├── prescriptions.ts               # draft/sign, allergy gate
│   ├── video.ts                       # reuse/share join window with patient domain
│   └── dashboard.ts                   # widget caps
├── lib/doctor/                        # loaders / mappers / context
├── ports/                             # extend: ai-assistant, telemedicine, safety-check
├── adapters/
└── auth/                              # reuse requireRole; add doctor permissions

prisma/schema.prisma                   # extensions in data-model.md

specs/004-doctor-portal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── ui-review.md
├── contracts/
└── design/                            # Stitch export target (mandatory before pixel UI)
```

**Structure Decision**: Single Next.js app; doctor feature module mirroring patient module boundaries (`doctor/` routes, `actions/doctor`, `components/doctor`, `domain/doctor`).

## Doctor Workspace Architecture

```text
DoctorLayout
  RoleLayoutGate(DOCTOR)
  DoctorPortalShell
    ├─ DoctorSidebar (Stitch nav)
    └─ DoctorHeader          # inside top nav: search, bell, profile
         └─ children

ConsultationWorkspace (RSC + client islands)
  ├─ loadWorkspace(appointmentId)
  │    assert assigned doctor + status IN_PROGRESS|COMPLETED (read)
  │    patient banner (allergies/critical)
  │    tabs/panels per Stitch: SOAP | Summary | Rx | Records | Labs | Video | AI
  ├─ mutations via Server Actions (save draft, sign, complete)
  └─ offline banner disables Sign/Finalize/Complete/Start
```

**Clinical workflow (canonical)**:

```text
Dashboard / Schedule / Queue
  → (optional) Patient Details
  → Start Consultation (≤1 IN_PROGRESS)
  → Workspace: document / prescribe / review labs / video / AI
  → Complete Visit
  → Pending notes until SOAP + Summary finalized or dismissed
```

## Shared Components

| Component | Role |
|-----------|------|
| `DoctorPortalShell` | Sidebar + header + main |
| `DoctorHeader` | Stitch inside top nav (search, notifications, user) |
| `EmptyState` / `ErrorState` / `ListSkeleton` | States (reuse patient shared patterns or `@/components/doctor/shared`) |
| `Pagination` / `SearchFilterBar` | Lists |
| `StatusBadge` | Appointment / note / Rx / lab |
| `AllergyBanner` / `CriticalFlagBanner` | Safety chrome |
| `ConfirmSignDialog` | Review & Sign attestation UX |
| `DocumentViewer` | Reuse patient viewer behind doctor auth proxy |
| `PendingNotesList` | Dashboard + notifications |
| `QueueRow` / `ScheduleRow` | Dense clinical lists |

Prefer extracting truly identical primitives to `components/portal/` only when Stitch confirms shared visual language; until then keep doctor components separate to avoid accidental patient IA bleed.

## Clinical Workflow (domain)

| Action | Rules |
|--------|--------|
| Start | Appointment assigned; status CONFIRMED\|CHECKED_IN; no other IN_PROGRESS for doctor |
| Check-in / queue | Status CHECKED_IN; ordered by checkedInAt then startAt |
| Complete | IN_PROGRESS → COMPLETED; pending notes if unsigned SOAP/summary |
| No-show | CONFIRMED\|CHECKED_IN → NO_SHOW |
| SOAP finalize | Assessment+Plan non-empty; Review & Sign; FINAL immutable |
| Amend | New version + reason; late if &gt;72h |
| Rx sign | Not Cancelled/No-show visit; allergy hard-block; interactions ack; DRAFT→ACTIVE |
| AI Accept | Copies to draft only; never FINAL/sign |

## Authorization Strategy

```text
middleware: cookie presence for /doctor/*
doctor/layout: requireRole("DOCTOR")
requireDoctorContext(): session + User.doctorProfileId → doctorId
every loader/action:
  appointment.doctorId === doctorId
  OR assertCareRelationship(doctorId, patientUserId)
document streams: same + audit PHI_VIEW|DOWNLOAD
anti-enumeration: NOT_FOUND for foreign ids
RBAC permissions: doctor:portal:access, doctor:chart:read, doctor:note:write,
  doctor:rx:sign, doctor:video:host, doctor:ai:use
```

Never trust client-supplied `doctorId`. Administrators are denied doctor portal (FR-001).

## Performance Strategy

- Parallel dashboard widgets via `Promise.allSettled`.
- Indexes: `(doctorId, startAt)`, `(doctorId, status)`, `(appointmentId)` on notes, `(recipientUserId, createdAt)` on notifications.
- Select minimal columns; include patient display name + allergy summary only where needed.
- Paginate lists (20); enforce dashboard `take` caps.
- Stream AI off the dashboard critical path.

## Caching Strategy

| Data | Cache |
|------|-------|
| PHI (chart, SOAP, Rx, labs, queue) | **no-store**; private |
| Dashboard | Per-request RSC; `revalidatePath` after mutations |
| CMS doctor public card fields | Short tagged cache OK when used without PHI |
| Stitch static assets | Standard static/image pipeline |

## AI Integration

```text
UI → /api/doctor/ai/chat (stream) or Server Action ensureConversation
  → requireRole(DOCTOR) + care relationship when patient-scoped
  → rateLimit(doctorUserId, 30/hour)
  → context: active visit highlights doctor already can see
  → AiAssistantPort (mode: medical | documentation | prescription)
  → persist DoctorAiMessage; retention job ≤12 months
  → Accept → draft SOAP fields or PrescriptionLine drafts only
```

Disclaimer always visible; failures degrade to manual workflow.

## Video Consultation Strategy

- Reuse `TelemedicinePort`; lazy room on first doctor/patient join.
- Doctor join = host; admit waiting patient when provider supports it.
- Shared domain `canJoinVideo` (15m before → 60m after or terminal status).
- Embed in `consultations/[id]/video`; audit join/leave/admit/fail.
- No recording download in v1; no media blobs in Neon.

## Medical Record Strategy

- Read `MedicalRecord` / `LabResult` / signed `Prescription` for care-relationship patients.
- Doctor labs: Preliminary + Final; patient portal remains Released-only.
- Authoring in v1 via SOAP → optional `MedicalRecord` projection on finalize; Clinical Summary; signed Prescription—no free-form forge upload.
- Attachments via `ClinicalDocument` + `/api/doctor/documents/[id]` proxy; views/downloads audited.
- Optional `LabReviewAcknowledgement` (doctorUserId, labResultId, reviewedAt).

## State Management

| Concern | Approach |
|---------|----------|
| Auth | Module 1 opaque session; read-only `auth()` in RSC |
| Lists / dashboard | RSC + Server Actions + `revalidatePath` |
| Filters | `searchParams` |
| AI / video / notif badge | React Query under doctor layout provider |
| Forms | RHF + Zod where interactive; server Zod for all mutations |
| Draft conflict | `version` / `updatedAt` token; CONFLICT code on stale save |

## API Contracts

See [contracts/doctor-api.md](./contracts/doctor-api.md) and [contracts/ui.md](./contracts/ui.md).

## Prisma Models

See [data-model.md](./data-model.md) — extends Module 2 with SOAP, ClinicalSummary, Rx lines/drafts, check-in fields, doctor notifications, AI doctor threads, lab review acks, optional panel.

## UI Review (Stitch)

See [ui-review.md](./ui-review.md). **Stitch MCP 401 at plan time** — pixel UI gated; domain/API may proceed.

## Project Structure (tests)

```text
tests/
├── unit/doctor/
├── integration/doctor/
└── e2e/doctor/
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Ports for AI/video/safety | BAA-swappable vendors + formulary evolution | Hard-coding blocks compliance ops |
| Separate doctor AI tables | Prevent cross-role thread leakage | Shared patient AiConversation risky |
| Versioned SOAP/Rx rows | Immutable signed clinical content | In-place update fails attestation |
| DoctorHeader top nav | Spec/Stitch inside top nav | Sidebar-only fails approved IA |
