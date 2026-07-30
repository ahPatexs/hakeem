# Implementation Plan: Patient Portal & Dashboard

**Branch**: `003-patient-portal` | **Date**: 2026-07-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-patient-portal/spec.md`

## Summary

Build the authenticated **Patient Portal** inside the existing Next.js 15 app: personalized dashboard widgets, profile/medical profile, doctor discovery & appointment booking (hold→confirm), upcoming/history management, video join window, medical records/labs/prescriptions with in-portal document viewer, payments, notification center, settings, and AI medical assistant—scoped strictly to `PATIENT` via Module 1 auth guards. UI must match **approved Stitch** designs (no redesign). Stack: App Router, TypeScript strict, Tailwind, shadcn/ui, React Query (client islands), Prisma + Neon, Zod, Server Actions.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), Node.js 20 LTS

**Primary Dependencies**: Next.js 15 (App Router, RSC, Server Actions, Route Handlers), Prisma 6.x, Zod, Tailwind CSS, shadcn/ui, `next-intl`, `@tanstack/react-query` (client interactive lists/chat), Module 1 `@/auth` session + RBAC, Vercel Blob (or S3-compatible) for uploads, payment provider SDK (Stripe-compatible abstract), telemedicine provider adapter (Daily/LiveKit/Twilio—abstracted), AI via Vercel AI SDK / gateway behind `AiAssistantPort`

**Storage**: Neon PostgreSQL via Prisma; encrypted object storage for PHI documents; no card PAN in DB

**Testing**: Vitest (domain rules: holds, join window, release visibility, idempotent pay), Playwright (portal journeys), authorization matrix tests (cross-patient denial)

**Target Platform**: Vercel + Neon; evergreen browsers; Stitch responsive breakpoints

**Project Type**: Web application (extend single Next.js monorepo app)

**Performance Goals**: Dashboard interactive ≤ 30s post-login (SC-001); widget p95 data &lt; 500ms; lists paginated (20); no full-table PHI dumps to client

**Constraints**: Stitch SoT; PATIENT-only; HIPAA-ready controls (TLS, encryption at rest, ≥6y PHI audit, no PHI in URLs/analytics); no offline-first PHI; bilingual EN/AR + RTL; Module 1 sessions reused

**Scale/Scope**: ~15–20 patient routes × 2 locales; widget caps per clarifications; thousands of patients; document blobs per patient ≤ 20 uploads + clinician attachments

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template — **PASS by default**. Discipline: single-app extension; reuse Module 1 auth; Server Actions + Zod; no speculative microservices; adapters for pay/video/AI/storage.

**Post-Phase 1 re-check**: New Prisma clinical/scheduling tables + blob metadata + audit events required by clarified spec — justified. External pay/video/AI behind ports — justified. **PASS**.

## Route Structure

Locale-prefixed App Router under `src/app/[locale]/patient/`:

```text
/{locale}/patient                          # Dashboard (home)
/{locale}/patient/profile                  # Profile management
/{locale}/patient/medical-profile          # Medical profile
/{locale}/patient/settings                 # Settings (lang + notification prefs)
/{locale}/patient/doctors                  # Find doctors
/{locale}/patient/doctors/[slug]           # Doctor detail + book entry
/{locale}/patient/appointments             # Upcoming (default) + tabs/links to history
/{locale}/patient/appointments/upcoming
/{locale}/patient/appointments/history
/{locale}/patient/appointments/book        # Book flow (doctor/slot query params)
/{locale}/patient/appointments/[id]        # Detail (cancel/reschedule/join)
/{locale}/patient/consultations/[id]       # Video consultation shell
/{locale}/patient/records                  # Medical records list
/{locale}/patient/records/[id]             # Record detail + viewer
/{locale}/patient/labs                     # Lab results
/{locale}/patient/labs/[id]
/{locale}/patient/prescriptions            # Active + history
/{locale}/patient/prescriptions/[id]
/{locale}/patient/payments                 # History + pay
/{locale}/patient/payments/[id]
/{locale}/patient/notifications            # Notification center
/{locale}/patient/ai                       # AI Medical Assistant
/{locale}/account/change-password          # Existing Module 1
/{locale}/account/sessions                 # Existing Module 1
```

**Layouts**: `patient/layout.tsx` already `requireRole("PATIENT")` — extend with patient chrome (sidebar/top nav per Stitch), not marketing Navbar (ChromeGate already hides marketing chrome only for auth routes; patient routes keep portal shell).

**API Route Handlers** (when Server Actions insufficient — streaming/webhooks):

```text
/api/patient/uploads                       # POST multipart → blob (CSRF + auth)
/api/patient/payments/webhook              # Provider webhooks (signature verify)
/api/patient/ai/chat                       # Optional streaming AI (auth + CSRF)
/api/patient/documents/[id]                # Authenticated document stream
```

## Folder Structure

```text
src/
├── app/[locale]/patient/           # Routes above + layout
├── actions/patient/                 # Server Actions (Zod in/out)
│   ├── dashboard.ts
│   ├── profile.ts
│   ├── medical-profile.ts
│   ├── appointments.ts
│   ├── doctors.ts
│   ├── records.ts
│   ├── labs.ts
│   ├── prescriptions.ts
│   ├── payments.ts
│   ├── notifications.ts
│   └── settings.ts
├── components/patient/              # Stitch-faithful UI
│   ├── shell/                       # PortalNav, PortalHeader
│   ├── dashboard/                   # Widgets
│   ├── appointments/
│   ├── doctors/
│   ├── records/                     # DocumentViewer
│   ├── prescriptions/
│   ├── labs/
│   ├── payments/
│   ├── notifications/
│   ├── profile/
│   ├── settings/
│   ├── ai/
│   └── shared/                      # EmptyState, ErrorState, ListSkeleton, Pagination
├── domain/patient/                  # Pure business rules (testable)
│   ├── appointments.ts              # hold/confirm/cancel windows
│   ├── video.ts                     # join window
│   ├── labs.ts                      # release visibility
│   ├── prescriptions.ts             # active vs historical
│   └── payments.ts                  # idempotency keys
├── lib/patient/                     # Data loaders / mappers
├── ports/                           # Interfaces
│   ├── storage.ts
│   ├── payments.ts
│   ├── telemedicine.ts
│   └── ai-assistant.ts
├── adapters/                        # Concrete ports
└── auth/                            # Module 1 (reuse requireRole/Permission)

prisma/schema.prisma                 # Extended models (see data-model.md)

specs/003-patient-portal/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── ui-review.md
├── contracts/
└── design/                          # Stitch export target (mandatory before UI tasks)
```

**Structure Decision**: Single Next.js app; patient feature module under `patient/` routes + `actions/patient` + `components/patient` + `domain/patient` + ports/adapters for external systems.

## Dashboard Architecture

```text
PatientDashboard (RSC)
  ├─ loadDashboardBundle(userId)     # parallel Prisma queries / Promise.all
  │    widgets: upcoming(3), recentDoctors(5), activeRx(3),
  │             recentRecords(3), notifSummary, paymentStatus
  ├─ WelcomeHeader
  ├─ WidgetGrid
  │    each widget: data | EmptyState | ErrorState(+retry Server Action)
  └─ QuickActions (static links)
```

- **Server-first**: Initial paint from RSC (PHI never in public cache).
- **Isolation**: Per-widget try/catch in loader; one failure → widget error, others OK (FR-043).
- **Refresh**: `revalidatePath` / `router.refresh` after mutations; optional React Query only for AI chat & live notification polling if Stitch requires.

## Shared Components

| Component | Role |
|-----------|------|
| `PortalShell` | Stitch patient nav + main |
| `EmptyState` | Title, hint, primary CTA |
| `ErrorState` | Safe message + retry |
| `ListSkeleton` / `WidgetSkeleton` | Loading |
| `Pagination` | Page size 20 |
| `SearchFilterBar` | Text + status/date filters |
| `StatusBadge` | Appointment/payment/lab/Rx |
| `ConfirmDialog` | Cancel/pay confirmations |
| `DocumentViewer` | PDF/image preview |
| `FileUploadField` | Type/size validation UX |
| `MoneyDisplay` | Localized currency |
| `RelativeTime` | Dates EN/AR |

Reuse shadcn primitives (Button, Input, Dialog, Select, Tabs, Card only where Stitch interaction requires container semantics).

## State Management

| Concern | Approach |
|---------|----------|
| Auth session | Module 1 opaque cookie + `auth()` (server) |
| Dashboard / lists | RSC fetch + Server Action mutations + `revalidatePath` |
| Interactive filters (client) | URL searchParams as source of truth (shareable, SSR-friendly) |
| AI chat streaming | React Query mutation + local message cache for thread UI |
| Notifications live badge | RSC initial + optional short polling via React Query (`refetchInterval`) when tab visible |
| Forms | React Hook Form + Zod resolver (matches existing patterns) |

**No global Redux**. React Query provider scoped under patient layout for client islands only.

## Authorization Strategy

```text
middleware: cookie presence for /patient/*
patient/layout: requireRole("PATIENT")
every action/loader: assert resource.userId === session.user.id
document/stream routes: same ownership check + auditLog(PHI_VIEW|DOWNLOAD)
anti-enumeration: return generic NOT_FOUND for cross-patient IDs
```

- Extend `src/auth/rbac.ts` permissions: `patient:portal:access`, `patient:records:read`, `patient:payments:write`, etc. (Patient-only grants).
- Never trust client-provided `patientId`.

## Performance Strategy

- Parallel widget queries; select minimal columns.
- Composite indexes: `(patientUserId, startAt)`, `(patientUserId, status)`, `(patientUserId, createdAt)`.
- Pagination hard limit; dashboard caps enforced in queries (`take`).
- Avoid N+1: `include` doctor summary on appointment lists.
- Streaming AI separate from dashboard TTFB.

## Caching Strategy

| Data | Cache |
|------|-------|
| PHI (records, labs, Rx, appointments, payments) | **No** shared CDN/public cache; `Cache-Control: private, no-store` on document streams |
| Doctor directory (non-PHI) | `unstable_cache` / `use cache` with tags `doctors` short TTL OK |
| Dashboard | Per-request RSC; revalidate on mutation |
| Stitch static assets | Standard Next image/static |

## Image Strategy

- Doctor avatars / marketing images: `next/image` + existing public/CMS URLs.
- PHI images (uploads, record scans): **not** via public `/_next/image` remotePatterns to open buckets — serve through authenticated `/api/patient/documents/[id]` with short-lived signed upstream fetch if needed.
- Prefer server-side resize only inside trusted pipeline if required later.

## File Upload Strategy

1. Client → `POST /api/patient/uploads` (auth + CSRF + Zod MIME allowlist).
2. Validate type PDF/JPEG/PNG, size ≤10MB, count &lt;20.
3. Malware scan hook (ClamAV/vendor) — fail closed in prod; stub in local.
4. Store in private bucket path `patients/{userId}/{uploadId}`; DB `PatientUpload` metadata only.
5. Link to Medical Profile or standalone attachment per Stitch.
6. Audit accept/reject.

## Medical Record Strategy

- Clinician-authored `MedicalRecord`, `LabResult`, `Prescription` rows owned by `patientUserId`.
- Patient **read-only**; filters: Released labs only; Active Rx rule in domain.
- Attachments via `ClinicalDocument` metadata → blob; viewer component; download audited (FR-046/047).
- Search: `title`/`type` ILIKE + date range; never cross-tenant.

## AI Integration Strategy

```text
UI (Stitch) → Server Action or /api/patient/ai/chat (stream)
  → requireRole(PATIENT)
  → rateLimit(userId)
  → buildContext({ medicalProfile summary, upcoming appointments titles })  # own data only
  → AiAssistantPort.chat({ messages, locale, disclaimerRequired: true })
  → persist AiMessage (≤12 months retention job)
  → never write clinical tables
```

- System prompt enforces non-diagnosis / emergency redirect.
- Separate from public marketing AI assistant route.

## Payment Strategy (summary)

- `PaymentObligation` + `PaymentAttempt` with idempotency key per obligation.
- Provider adapter createPaymentIntent → client confirm → webhook marks Paid.
- Dashboard aggregate outstanding sum where `status=PENDING`.

## Video Strategy (summary)

- On Confirmed video appointment, provision room via `TelemedicinePort` (lazy on first join).
- Join gate: domain `canJoinVideo(now, appointment)`.
- Embed provider SDK in `consultations/[id]` client component; audit join/leave.

## Project Structure (tests)

```text
tests/
├── unit/patient/           # domain rules
├── integration/patient/    # actions + prisma test db
└── e2e/patient/            # Playwright journeys
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| Ports for pay/video/AI/storage | Spec requires swap-friendly HIPAA vendor BAAs | Hard-coding one vendor blocks ops |
| React Query addition | Streaming AI + optional notif polling | Pure RSC awkward for token streams |
| Authenticated document proxy | PHI must not use public CDN URLs | Public blob URLs fail FR-046/059 |
