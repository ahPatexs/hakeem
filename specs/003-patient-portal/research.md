# Research: Patient Portal & Dashboard

**Date**: 2026-07-29 | **Plan**: [plan.md](./plan.md)

Mandated stack: Next.js 15 App Router, TypeScript strict, Tailwind, shadcn/ui, React Query, Prisma, Neon, Zod, Server Actions. Research resolves application to clarified patient-portal spec.

## D1. Server Components vs React Query

- **Decision**: RSC + Server Actions for dashboard, lists, and mutations; add `@tanstack/react-query` only for AI streaming chat UX and optional notification badge polling.
- **Rationale**: PHI should default to server-owned fetch (no-store); React Query helps interactive streaming without making the whole portal a SPA.
- **Alternatives considered**: Full client React Query for all data (more cache/PHI leakage risk); RSC-only AI (poor streaming DX).

## D2. Appointment hold → confirm

- **Decision**: `Appointment` row with `HELD` + `holdExpiresAt`; unique partial constraint on doctor+slot for non-cancelled; confirm within 10m → `CONFIRMED`; cron/lazy cleanup expired holds.
- **Rationale**: Matches clarification; prevents double-book races better than client-only timers.
- **Alternatives considered**: Confirm-only without hold (racey); Redis-only holds (split brain with SQL availability).

## D3. Doctor directory source

- **Decision**: Reuse CMS `Doctor` + `Specialty` for Find Doctors; booking references `doctorId` (CMS) and optional `User` link when clinical doctor account exists (`User.doctorProfileId`).
- **Rationale**: Public catalog already exists; patient booking needs stable doctor identity without waiting for full doctor-portal module.
- **Alternatives considered**: Duplicate doctor table (drift); require auth User for every bookable doctor (blocks MVP).

## D4. Telemedicine provider abstraction

- **Decision**: `TelemedicinePort` with lazy room create; v1 adapter TBD (LiveKit or Daily) chosen at implement behind env flags.
- **Rationale**: Spec needs join window UX; vendor is ops/BAA concern; abstraction avoids UI rewrite.
- **Alternatives considered**: Build WebRTC in-house (out of scope); hard-code one SDK in components (lock-in).

## D5. Payments abstraction

- **Decision**: `PaymentsPort` with PaymentIntent + webhook; Stripe-compatible shapes; idempotency key = `obligationId`.
- **Rationale**: Spec requires no double Paid charge and no PAN storage.
- **Alternatives considered**: Manual “mark paid” only (fails real checkout); storing cards in Neon (unacceptable).

## D6. Object storage for PHI files

- **Decision**: Private bucket (Vercel Blob private or S3) + `ClinicalDocument`/`PatientUpload` metadata; serve via authenticated proxy route.
- **Rationale**: FR-046/059 — no public unauthenticated document URLs.
- **Alternatives considered**: DB bytea (poor for large PDFs); public CDN URLs (PHI leak).

## D7. Malware scanning

- **Decision**: Upload pipeline calls `MalwareScanPort`; production fail-closed; local/dev may stub “clean”.
- **Rationale**: Enterprise upload requirement; don’t block local DX.
- **Alternatives considered**: No scanning (rejected for healthcare uploads).

## D8. AI assistant

- **Decision**: Vercel AI SDK (or AI Gateway) behind `AiAssistantPort`; server-built context from patient’s own profile/appointments; persist messages; retention job 12 months.
- **Rationale**: Spec permissions + disclaimer + no clinical writes.
- **Alternatives considered**: Client-only LLM keys (secret leak); shared public AI thread (wrong authz).

## D9. Dashboard widget isolation

- **Decision**: `Promise.allSettled` (or per-widget try/catch) in dashboard loader; map rejected to widget error DTO.
- **Rationale**: FR-043 / SC-013.
- **Alternatives considered**: Single query join (one failure blanks all).

## D10. URL state for filters

- **Decision**: `searchParams` for q/specialty/status/from/to/page on list routes.
- **Rationale**: SSR-friendly, shareable, works with next-intl; aligns with existing doctors filters on public site.
- **Alternatives considered**: Only client state (breaks refresh/share).

## D11. Caching PHI

- **Decision**: Explicit `no-store` for PHI responses; tag-cache only non-PHI doctor directory.
- **Rationale**: HIPAA-ready minimum necessary + stale PHI risk.
- **Alternatives considered**: ISR for records (unsafe).

## D12. Audit retention

- **Decision**: Reuse `SecurityAuditEvent` (and/or `PhiAccessEvent` subtype via `type` field) with ≥6y retention for PHI view/download; extend purge job to respect longer PHI retention vs shorter auth-only events if split later.
- **Rationale**: Clarified HIPAA-aligned retention.
- **Alternatives considered**: Application logs only (not durable/queryable enough).

## D13. Stitch design gate

- **Decision**: UI implementation tasks blocked until screens exported to `specs/003-patient-portal/design/`; Stitch MCP returned 401 during planning — same pattern as auth module.
- **Rationale**: Spec FR-005; no redesign.
- **Alternatives considered**: Invent UI from Tailwind guesses (forbidden).

## D14. Chrome / shell

- **Decision**: Patient portal uses dedicated `PortalShell` inside `patient/layout`; marketing `Navbar`/`Footer` remain for public site; optionally hide marketing chrome on `/patient/*` via ChromeGate segment list extension.
- **Rationale**: Stitch patient IA ≠ marketing nav; auth screens already hide chrome.
- **Alternatives considered**: Keep marketing nav on portal (fails design consistency).

All Technical Context items resolved — no remaining NEEDS CLARIFICATION.
