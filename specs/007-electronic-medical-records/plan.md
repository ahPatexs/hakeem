# Implementation Plan: Electronic Medical Records (EMR)

**Branch**: `007-electronic-medical-records` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-electronic-medical-records/spec.md` (FR-001–FR-048, including non-interactive enterprise clarifications).

## Summary

Deliver Hakeem’s **clinical core EMR**: a shared chart domain (summary, history, allergies/conditions/immunizations, encounters, diagnoses, SOAP/notes, care/treatment plans, prescriptions + renewals, labs/imaging/reports, documents, consents, longitudinal timeline) with RBAC for Patient, Doctor, and Administrator. UI follows **approved Stitch** designs already used by Patient/Doctor portals — **do not redesign**.

Centralize under `domain/emr` + `lib/emr` + `components/emr`; portals consume facades. Reuse Platform Services for files/audit/notifications/AI context; extend Prisma clinical models already present from Modules 3–4.

**Technology stack (mandated)**: Next.js 15 App Router · TypeScript strict · Prisma ORM · Neon PostgreSQL · React Query · Zod · Server Actions · existing Tailwind/shadcn/`next-intl`.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), Node.js 20 LTS

**Primary Dependencies**: Next.js 15 (App Router, RSC, Server Actions), Prisma 6.x, Zod, `@tanstack/react-query`, Tailwind + shadcn/ui, `next-intl`, Platform Services (`@/lib/platform/*`), Auth RBAC

**Storage**: Neon PostgreSQL (chart entities, versions, consents, timeline events); private object storage via Platform `StoragePort` for attachments

**Testing**: Vitest (RBAC matrix, versioning/immutability, release rules, consent lifecycle, timeline integrity, soft-delete); integration tests against Prisma; Playwright smoke for summary/timeline/Rx/labs per role

**Target Platform**: Vercel + Neon; evergreen browsers; Stitch SoT for EMR surfaces

**Project Type**: Web application — clinical domain layer inside single Next.js app

**Performance Goals**: Summary sections load independently (one failure does not blank chart); list/timeline p95 usable with page size 20 / window 50; signed download URL mint &lt; 500ms; search stays in-chart with RBAC (no cross-patient leak)

**Constraints**: Stitch SoT (no redesign); EN/AR + RTL + a11y; PHI minimum-necessary; soft-delete only; signed artifact immutability; Admin cannot prescribe/sign; no live HL7/FHIR server; no break-glass; doctor-initiated renewals only; ICD-10 optional

**Scale/Scope**: One chart per patient; ambulatory/telemedicine volumes; ~10–15 Stitch-aligned EMR surfaces across Patient/Doctor/Admin; consolidate fragmented portal clinical logic into EMR facades

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template — **PASS by default**. Discipline: shared EMR domain over portal-local clinical forks; Platform for files/audit; no speculative microservice; no UI redesign.

**Post-Phase 1 re-check**: data-model, contracts, timeline/attachment/security/audit/cache/search/perf strategies, and ui-review are documented — **PASS**.

## EMR Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Patient Portal │ Doctor Portal │ Admin Portal                        │
│ Routes mount components/emr/* ; call actions/emr/* or thin wrappers │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│ actions/emr/* (Zod in → Server Actions)                              │
│ lib/emr/* facades (summary, chart, timeline, rx, labs, docs, consent)│
│ domain/emr/* (RBAC assert, versioning, release rules, timeline build)│
└───────────────┬─────────────────────────────┬───────────────────────┘
                │                             │
     ┌──────────▼──────────┐       ┌──────────▼──────────────────────┐
     │ Prisma / Neon       │       │ Platform Services               │
     │ Chart entities      │       │ documents, storage, audit,      │
     │ versions, consents  │       │ notifications, AI context gate  │
     │ EmrTimelineEvent    │       └─────────────────────────────────┘
     └─────────────────────┘
```

**Principles**:
1. Portals never bypass `assertEmrAccess`.
2. Signed clinical content is append-version only.
3. Attachments always Platform-mediated (scan + short-lived download).
4. Timeline is projection of authoritative writes (with materialization table).
5. AI may read authorized structured context; never sign.
6. Outcomes use Platform taxonomy (`SUCCESS`, `FORBIDDEN`, `NOT_FOUND`, …).

### Named EMR capabilities

| Capability | Facade | Notes |
|------------|--------|-------|
| Chart Summary | `lib/emr/summary` | Widgetized sections |
| Medical History / Profile domains | `lib/emr/history` | allergies, conditions, family, lifestyle, emergency, immunizations |
| Encounters & Diagnoses | `lib/emr/encounters`, `lib/emr/diagnoses` | ICD-10 optional |
| SOAP / Notes / Summaries | `lib/emr/notes` | wrap/extend existing SoapNote flows |
| Care / Treatment Plans | `lib/emr/plans` | new |
| Prescriptions & Renewals | `lib/emr/prescriptions` | `renewedFromId` |
| Labs / Imaging / Reports | `lib/emr/diagnostics` | release rules |
| Documents & Attachments | `lib/emr/documents` | Platform storage |
| Consents | `lib/emr/consents` | versioned text |
| Medical Timeline | `lib/emr/timeline` | derived + `EmrTimelineEvent` |
| Admin Oversight | `lib/emr/admin` | read/export/hold |

## Folder Structure

### Documentation (this feature)

```text
specs/007-electronic-medical-records/
├── plan.md                 # this file
├── research.md
├── data-model.md
├── quickstart.md
├── ui-review.md
├── design/manifest.json
├── contracts/
│   ├── emr-api.md
│   └── ui.md
└── tasks.md                # /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
src/
├── domain/emr/
│   ├── access.ts              # assertEmrAccess + care relationship
│   ├── versioning.ts          # sign / amend / renew rules
│   ├── release.ts             # lab/document patient visibility
│   ├── timeline.ts            # event mapping + ordering integrity
│   ├── consent.ts             # ack/withdraw + gating
│   ├── soft-delete.ts
│   └── outcomes.ts            # re-export platform outcomes if shared
├── lib/emr/
│   ├── summary.ts
│   ├── history.ts
│   ├── encounters.ts
│   ├── diagnoses.ts
│   ├── notes.ts
│   ├── plans.ts
│   ├── prescriptions.ts
│   ├── diagnostics.ts
│   ├── documents.ts
│   ├── consents.ts
│   ├── timeline.ts
│   └── admin.ts
├── actions/emr/               # Zod-validated Server Actions
├── components/emr/            # Stitch-aligned shared EMR UI (NO redesign)
│   ├── summary/
│   ├── timeline/
│   ├── history/
│   ├── diagnoses/
│   ├── soap/
│   ├── prescriptions/
│   ├── labs/
│   ├── imaging/
│   ├── documents/
│   ├── loading-state.tsx | empty-state.tsx | error-state.tsx  # or re-export platform
│   └── index.ts
├── hooks/emr/
│   ├── use-emr-timeline.ts
│   ├── use-emr-labs.ts
│   └── use-emr-prescriptions.ts
├── app/[locale]/
│   ├── patient/…              # mount EMR components (records, labs, rx, timeline)
│   ├── doctor/…               # chart, SOAP, labs, rx, timeline
│   └── admin/…                # oversight chart when Stitch provides
└── i18n/messages/             # emr.* namespaces en/ar

prisma/
├── schema.prisma              # extend + new EMR models (see data-model.md)
└── migrations/

tests/
├── unit/emr/
├── integration/emr/
└── e2e/emr/
```

**Structure Decision**: Single Next.js app; EMR domain/facade/UI kit parallel to `platform/` and portal folders. Migrate portal-local clinical calls to EMR facades incrementally without changing Stitch routes/IA.

## Database Design

See [data-model.md](./data-model.md) for full entity catalog.

**Strategy**:
- Keep existing `SoapNote`, `ClinicalSummary`, `Prescription`, `LabResult`, `ClinicalDocument`, `MedicalRecord`, `MedicalProfile`, `PatientUpload`.
- Normalize profile domains into typed tables (or versioned rows) with `source` = PATIENT_REPORTED | CLINICIAN_ATTESTED.
- Add `Diagnosis`, `CarePlan`/`TreatmentPlan`, consent tables, `renewedFromId` on prescriptions, soft-delete columns, `EmrTimelineEvent`.
- Indexes: `(patientUserId, effectiveAt)`, status filters, unique active SOAP per appointment where required.

## Prisma Models

Documented in [data-model.md](./data-model.md). Implementation creates/extends Prisma models + migration under `prisma/migrations/`.

## API Contracts

Server Actions are the primary API (not a public REST EMR API in v1). Contracts in [contracts/emr-api.md](./contracts/emr-api.md): input Zod shapes, outcomes, RBAC notes. Optional Route Handlers only for attachment download re-use of Platform file routes.

## Timeline Architecture

1. **Write path**: On clinically material mutations, upsert `EmrTimelineEvent` (`type`, `patientUserId`, `effectiveAt`, `actorUserId`, `refType`, `refId`, `visibility` PATIENT|CLINICIAN|ADMIN, `status` ACTIVE|SUPERSEDED|HIDDEN).
2. **Read path**: `listTimeline({ patientUserId, filters, cursor })` applies role visibility + filters; default window 50; stable sort `effectiveAt DESC, id DESC`.
3. **Integrity**: Never update past events’ semantic payload in place for corrections—set SUPERSEDED/HIDDEN and append compensations (FR-043).
4. **Facets**: Visit/Appointment history = filtered views of the same event stream (+ live appointment rows for upcoming).

## Attachment Strategy

1. Upload via Platform upload → `PatientUpload` / `ClinicalDocument` with EMR classification enum.
2. Malware scan fail-closed before chart availability.
3. Link attachment to parent (lab, note version, referral, consent evidence).
4. Signed parent ⇒ attachment bytes immutable; new version gets new file.
5. Soft-delete hides from default lists; compliance can still resolve under hold.
6. Download: Platform `getDownloadUrl` + EMR access assert + audit.

## Security Strategy

| Control | Approach |
|---------|----------|
| AuthN | Existing Auth session |
| AuthZ | `assertEmrAccess` matrix FR-036 |
| PHI in transit | HTTPS only |
| PHI at rest | Neon + private storage encryption |
| URLs | Opaque cuids; no names/MRNs in paths |
| Downloads | ≤15 min signed URLs |
| Notifications | Minimal clinical detail |
| Admin | Read/export/hold; no sign/prescribe |
| Logs | Redact secrets/PHI bodies |

## Audit Strategy

Emit via Platform/Auth audit on: chart open, section PHI views (sampled or detail-level per high-risk), download, sign/amend/renew, release/retract, consent ack/withdraw, soft-delete/restore, admin export/hold, denials. Meta: ids, hashes, codes — not full SOAP text. Retention ≥6 years.

## Caching Strategy

| Layer | Policy |
|-------|--------|
| RSC | Per-request dedupe for summary |
| React Query | Lists/timeline islands; invalidate on EMR mutations |
| HTTP | `private, no-store` for PHI responses |
| Download URLs | Not cached beyond TTL |
| Redis/shared PHI cache | **Not in v1** |

## Search Strategy

- In-chart only for Patient/Doctor; Admin cross-patient directory search separate and audited.
- Filters: q (title/label), status, type, dateFrom/dateTo.
- Page size 20; enforce same release/RBAC as browse.
- Optional `searchText` column maintained on write for documents/labs/diagnoses.

## Performance Strategy

- Widgetized summary (parallel section fetches; isolate errors).
- Timeline cursor pagination; avoid loading full history.
- Composite DB indexes on patient + time + status.
- Prefer `select` over fat `include`.
- Background: timeline backfill job if migrating historical rows.
- Perf smoke: summary + timeline under seeded 500-event chart remains interactive.

## Shared / Migrated UI

Promote clinical UI into `components/emr/*` matching Stitch (see [ui-review.md](./ui-review.md)). Portals keep routes; swap data hooks to EMR actions.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Materialized `EmrTimelineEvent` plus derived rules | Integrity + filter performance | Pure ad-hoc UNION queries become fragile and slow on large charts |
| Normalized history tables beyond `MedicalProfile` string arrays | Attestation source, soft-delete, ICD codes | String arrays cannot version, code, or RBAC cleanly |

## Project Structure (docs reminder)

```text
specs/007-electronic-medical-records/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── ui-review.md
├── design/
├── contracts/
└── tasks.md   # later
```
