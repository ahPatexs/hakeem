# Research: Electronic Medical Records (EMR)

**Feature**: `007-electronic-medical-records`  
**Date**: 2026-08-04  
**Spec**: [spec.md](./spec.md)

## Purpose

Resolve technical unknowns for Module 6 EMR against the mandated stack (Next.js 15 App Router, TypeScript strict, Prisma, Neon, React Query, Zod, Server Actions) and existing Hakeem modules (Auth, Patient, Doctor, Admin, Platform Services).

---

## Decision 1: EMR as shared clinical domain layer (not a fourth portal)

**Decision**: Implement EMR as `src/domain/emr/*` + `src/lib/emr/*` + `src/components/emr/*` + `src/actions/emr/*`, consumed by Patient/Doctor/Admin portal routes. No separate EMR login shell.

**Rationale**: Spec FR-033 / clarifications; mirrors Platform Services consumption pattern; avoids shell duplication.

**Alternatives considered**: Standalone EMR microsite (rejected — duplicates Auth/nav); keep all logic only in portal folders (rejected — fragments source of truth).

---

## Decision 2: Evolve existing Prisma clinical models + add missing chart domains

**Decision**: Extend current models (`MedicalProfile`, `SoapNote`, `ClinicalSummary`, `Prescription`/`Line`, `LabResult`, `ClinicalDocument`, `MedicalRecord`, `PatientUpload`) and add first-class entities for: structured allergies/conditions/immunizations/family/lifestyle/emergency (beyond string arrays), diagnoses (ICD-10 optional), care/treatment plans, consent records, prescription renewals (`renewedFromId`), soft-delete fields, timeline projection (or derived query), clinical version links already partially present on SOAP/Rx.

**Rationale**: Large portions already exist from Patient/Doctor portals; EMR centralizes and completes gaps (FR-001, FR-035–048).

**Alternatives considered**: Greenfield parallel schema (rejected — dual-write risk); JSON-only blob chart (rejected — weak search/versioning/RBAC).

---

## Decision 3: Authorization = Auth RBAC + EMR care-relationship guard

**Decision**: Every EMR facade call goes through `assertEmrAccess(actor, patientUserId, action)` implementing the FR-036 matrix. Care relationship reuses Doctor Portal rules (assigned appointment, schedule window, panel). Admin oversight is read/export/hold only.

**Rationale**: Spec RBAC clarifications; prevents UI-only hiding.

**Alternatives considered**: Break-glass (out of v1); Casbin external engine (overkill for v1).

---

## Decision 4: Clinical versioning pattern

**Decision**: Signed artifacts immutable; amendments create new rows with `version`, `parent*Id`, `amendmentReason`, `contentHash`, signer fields (already on SOAP/Summary/Rx). Soft-delete uses `deletedAt`/`hiddenAt` without destroying versions. Timeline emits compensating events on retract/hide.

**Rationale**: FR-008, FR-039, SC-004.

**Alternatives considered**: In-place overwrite with audit only (rejected — fails immutability); event-sourcing entire chart (deferred — complexity).

---

## Decision 5: Timeline architecture = derived projection + optional cache table

**Decision**: Primary read path: compose timeline from appointments, SOAP/summaries (signed), prescriptions, lab releases, documents, consents, soft-delete markers via a domain aggregator `buildMedicalTimeline`. Optional `EmrTimelineEvent` materialization for performance on large charts, refreshed on write via Platform jobs or inline upsert.

**Rationale**: FR-019, FR-043, SC-007, SC-018; start derived, materialize if p95 degrades.

**Alternatives considered**: Manual editable timeline (rejected — integrity risk); Elasticsearch (deferred).

---

## Decision 6: Attachments via Platform documents/storage

**Decision**: All EMR attachments use `lib/platform/documents` + `storage` + malware scan jobs; EMR adds classification, parent linkage, soft-delete, and immutability when bound to signed clinical artifacts. Downloads: short-lived signed URLs + audit (FR-042, Platform FR-033/044).

**Rationale**: Avoid second upload stack; SC-015.

**Alternatives considered**: Direct S3 from EMR (rejected — duplicates screening/TLS policy).

---

## Decision 7: Audit strategy

**Decision**: Emit EMR action types through `lib/platform/audit` / Auth audit with retention ≥6 years. Never store full note bodies in audit meta—ids, hashes, section keys only.

**Rationale**: FR-040; align Doctor/Admin audit floors.

**Alternatives considered**: Separate EMR-only audit table (optional later if volume requires; start shared).

---

## Decision 8: Caching strategy

**Decision**:
- **RSC**: default request memoization for chart summary within a render.
- **React Query**: client islands for timeline filters, lab lists, Rx lists (staleTime ~30s; invalidate on mutation).
- **No Redis** in v1 for PHI chart caches.
- **Do not** cache signed download URLs beyond their TTL.

**Rationale**: PHI minimization; Next.js 15 + React Query mandate.

---

## Decision 9: Search strategy

**Decision**: In-chart Prisma filters (`contains`/`startsWith` on titles, status enums, date ranges); page size 20. Cross-patient search Admin-only. Optional `searchText` denormalized on documents/labs for simpler queries. No public EMR search.

**Rationale**: FR-048, SC-017.

**Alternatives considered**: Full-text Postgres `tsvector` (phase later if needed); Meilisearch (out of v1).

---

## Decision 10: ICD-10 & FHIR readiness

**Decision**: `Diagnosis.code` optional ICD-10/ICD-10-CM string + `display`; catalog JSON/seed for picker. Structure entities for future FHIR R4 mapping; no live HL7/FHIR server in v1. Optional audited chart export JSON+PDF later.

**Rationale**: FR-046, FR-047.

**Alternatives considered**: Mandatory coding (rejected — blocks care); live FHIR server (out of scope).

---

## Decision 11: Consent management

**Decision**: `ConsentType` + `ConsentTextVersion` + `ConsentEvent` (ACKNOWLEDGE | WITHDRAW). Gate telemedicine/care actions that declare required consent types.

**Rationale**: FR-045, SC-014.

---

## Decision 12: Stitch UI SoT

**Decision**: Do not redesign. Reuse Stitch screens already captured in Patient/Doctor design packs (timeline, labs/radiology, prescriptions, patient overview, consultation/SOAP workspace). Export additional EMR-only frames into `specs/007-electronic-medical-records/design/` when Stitch MCP auth is available.

**Rationale**: Spec FR-002; Stitch MCP 401 during this plan run — use existing exports + screen inventory from modules 003/004/006.

**Alternatives considered**: Invent new EMR chrome (forbidden).

---

## Decision 13: Performance strategy

**Decision**: Summary query bounded (allergies, conditions, active Rx ≤N, recent encounters ≤N); timeline windowed (default 50 events); list pages 20; indexes on `(patientUserId, *At)`; avoid N+1 via Prisma `include`/`select`; fail soft per section on summary widgets.

**Rationale**: SC-001, edge case large timeline.

---

## Decision 14: Security strategy

**Decision**: TLS everywhere; PHI at rest via Neon + private storage; opaque cuid ids; `assertEmrAccess` on all mutations; redact operational logs; no PHI in notification bodies; session idle per Auth; Admin cannot sign clinical artifacts.

**Rationale**: FR-037, FR-038, FR-022.

---

## Open items deferred to implement / ops

- Stitch MCP re-auth to list/export any EMR-only screens not already in doctor/patient packs.
- Whether to materialize `EmrTimelineEvent` in first migration or after perf evidence (plan: **schema ready, write-through from day one** for integrity simplicity).
- ICD-10 catalog seed size (start with common ambulatory subset).
