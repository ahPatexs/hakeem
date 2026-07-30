# Research: Administration Portal & Platform Management

**Date**: 2026-07-30 | **Plan**: [plan.md](./plan.md)

Mandated stack: Next.js 15 App Router, TypeScript strict, Tailwind, shadcn/ui, React Query, Prisma, Neon, Zod, Server Actions. Research maps clarified admin-portal spec onto Module 1 auth + existing clinical/billing/AI tables. Stitch project `2408493713147971043` is UI SoT.

## D1. Server Components vs React Query

- **Decision**: RSC + Server Actions for dashboard, lists, mutations; React Query only for notification badge polling, optional health status pill refresh, and chart client interactivity fed by server props.
- **Rationale**: Matches patient/doctor portals; PHI/PII defaults to server-owned `no-store`; cookie mutation stays in actions/route handlers.
- **Alternatives considered**: Full SPA admin (cache/PHI risk); RSC-only live badge (poor UX).

## D2. Reuse vs rewrite Auth admin actions

- **Decision**: Move/extend `src/actions/auth/admin.ts` into `src/actions/admin/*` with thin re-exports during migration; keep `auditLog`, `requirePermission`, last-admin helpers.
- **Rationale**: Approve/reject/status/role already exist and are audited; portal needs richer UI + more domains without forking auth semantics.
- **Alternatives considered**: Duplicate actions under admin (drift); leave all in auth forever (unmaintainable).

## D3. RBAC: flat ADMIN + permission strings

- **Decision**: v1 every Active `ADMIN` receives full admin permission set; expand `Permission` union for billing/AI/settings/analytics/roles; Roles UI assigns primary `User.role` only—no custom role builder; no four-eyes.
- **Rationale**: Spec clarification; Auth already maps ADMIN → permissions; least-privilege strings prepare future without dual control now.
- **Alternatives considered**: DB-backed custom roles day one (scope); capability bits per admin user (Stitch lacks UI).

## D4. User lifecycle

- **Decision**: Use existing `AccountStatus` + session revoke on SUSPENDED/DEACTIVATED; soft deactivate only; unlock clears `lockedUntil`/`failedLoginCount`; block self-suspend and last-admin; reason ≥10 chars on suspend.
- **Rationale**: Aligns Auth data model + clarified FR-009/023.
- **Alternatives considered**: Hard delete (compliance risk); soft-delete flag separate from status (redundant).

## D5. Doctor approval ↔ public bookable

- **Decision**: On approve: `doctorApproval=APPROVED`, `status=ACTIVE`, invite set-password (existing); ensure CMS `Doctor` publish/bookable flag if present. On reject: `REJECTED` + reason. On suspend user doctor: `AccountStatus.SUSPENDED` + revoke sessions + exclude from public bookable queries; flag future CONFIRMED appointments for ops (no mass cancel).
- **Rationale**: Spec FR-010/011 + clarification; reuses Auth approve path.
- **Alternatives considered**: Mass-cancel on suspend (patient harm); separate DoctorApprovalStatus SUSPENDED (prefer account status).

## D6. Billing refunds

- **Decision**: Extend `PaymentStatus` with `PARTIALLY_REFUNDED` | `DISPUTED`; add `refundedAmountCents`, `refundReason`, `refundedAt`, `refundedByUserId` on `PaymentObligation`; refund action checks remaining balance; provider adapter optional (`PaymentPort.refund`) with manual settlement fallback.
- **Rationale**: Spec full/partial refund + dispute annotation.
- **Alternatives considered**: Negative PaymentAttempt only (harder reporting); external-only refunds (breaks admin FR).

## D7. Platform settings & maintenance

- **Decision**: `PlatformSetting` key-value (string/bool/json) with audited before/after; keys include `maintenanceMode`, `maintenanceMessage`, `supportEmail`, `supportPhone`, `ai.patientEnabled`, `ai.doctorDocumentationEnabled`, `ai.doctorPrescriptionEnabled`. Middleware/layout reads maintenance for non-admin.
- **Rationale**: Spec FR-017/018; immediate effect via tag revalidation.
- **Alternatives considered**: `.env` only (redeploy); edge config vendor lock-in day one.

## D8. System health checks

- **Decision**: Domain `runHealthChecks()` probes DB (`SELECT 1`), optional payment/AI/telemedicine port `ping()`; persist latest `SystemHealthSnapshot`; overall = Down if app/DB fail else Degraded if any integration fails else Healthy. Dashboard reads same snapshot.
- **Rationale**: Spec FR-019; testable without full APM.
- **Alternatives considered**: External status page only; client-side fetch to vendors (CORS/secrets).

## D9. AI governance

- **Decision**: Global toggles via PlatformSetting; per-user `UserAiRestriction` (or JSON on User/PortalSettings) with reason; flag table `AiFlaggedConversation` linking patient or doctor conversation ids; review marks `reviewedAt`/`reviewedByUserId`/note; fail closed when disabled.
- **Rationale**: Spec FR-013/037.
- **Alternatives considered**: Delete conversations on flag (destroys evidence); soft-only UI hide (unsafe).

## D10. Analytics & reporting

- **Decision**: Server-side SQL aggregations by period; interactive charts from series DTOs; CSV export via route handler with 10k row cap; audit export events; optional 60s tagged cache for count-only aggregates.
- **Rationale**: Spec analytics vs reporting split; no BI warehouse.
- **Alternatives considered**: Client-side full table scan (unscalable); always-cache PHI metrics (rejected).

## D11. Notifications & announcements

- **Decision**: Reuse `Notification` with `recipientUserId`; extend categories for admin ops (`SECURITY`, `HEALTH`, `AI_GOVERNANCE`, keep `PAYMENT`/`SYSTEM`); `PlatformAnnouncement` for segment broadcast creating per-user notifications or a lightweight announcement feed.
- **Rationale**: Spec FR-021/033; single notification system.
- **Alternatives considered**: Separate AdminNotification table (duplicate); email-only (fails in-portal primary).

## D12. Audit retention vs Auth floor

- **Decision**: Continue writing to `SecurityAuditEvent`; product retention ≥6 years (ops/infra); UI never deletes; exports audited.
- **Rationale**: Clarified admin audit stricter than Auth ≥365d floor.
- **Alternatives considered**: Separate AdminAudit table (duplicate); editable audit (non-compliant).

## D13. Backup & recovery

- **Decision**: No restore UI; document RPO≤24h / RTO≤8h as infra assumptions; admins use Health + Audit during incidents.
- **Rationale**: Spec FR-035.
- **Alternatives considered**: In-app restore (catastrophic misuse risk).

## D14. Stitch UI binding

- **Decision**: Map routes to titled Stitch screens in `contracts/ui.md` / `ui-review.md`; export PNGs/HTML to `design/` before pixel work; adapt desktop 2560 compositions to existing Hakeem responsive tokens without redesigning IA.
- **Rationale**: User directive + module pattern.
- **Alternatives considered**: Redesign with shadcn defaults (rejected); block all backend until mobile Stitch exists (unnecessary—responsive adaptation allowed).

## D15. Caching PHI vs aggregates

- **Decision**: no-store for user/billing/audit detail; short TTL only for anonymous aggregates (counts/sums).
- **Rationale**: HIPAA-ready minimum necessary + SC-005.
- **Alternatives considered**: Cache full user pages (stale suspend risk).
