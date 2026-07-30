# Feature Specification: Administration Portal & Platform Management

**Feature Branch**: `005-admin-portal`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "Module 4: Administration Portal & Platform Management — operational control center for authenticated Administrators to manage users, doctors, appointments, AI operations, billing, payments/revenue, reports/analytics, platform settings, system health, audit logs, notifications, and roles/permissions. UI already designed and approved in Stitch MCP (do not redesign). Dashboard KPIs and quick actions as specified. Responsive, accessible, English/Arabic with RTL."

## Clarifications

### Session 2026-07-30

- Q: Who may access the Administration Portal? → A: Only authenticated users with the Administrator role (see Assumptions).
- Q: Is the Stitch design authoritative for layout and visuals? → A: Yes — approved Stitch MCP design is the single source of truth; implementation must match it; do not redesign.
- Q: Primary languages and directionality? → A: English and Arabic with full RTL support for Arabic.

Non-interactive clarification pass: user directed no questions; enterprise-grade assumptions applied after validating RBAC, user lifecycle, doctor approval workflow, audit logging, platform monitoring, billing workflows, AI governance, analytics, reporting, notification management, system settings, security monitoring, and backup & recovery. All decisions recorded below and reflected in Requirements, Assumptions, Edge Cases, User Stories, and Success Criteria.

- Q: RBAC model for the Administration Portal? → A: Access requires authenticated `ADMIN` with account status Active. v1 uses a single primary platform role per user (`PATIENT` | `DOCTOR` | `ADMIN`) consistent with Auth & RBAC. Every Active Administrator receives full Administration Portal capabilities in v1 (no separate “read-only admin” or custom role builder unless Stitch explicitly requires it). Role & Permission Management lets Administrators view role definitions, assign/revoke the Administrator role (and other primary roles where Auth allows), and invite/provision additional Administrators. OAuth/IdP claims never elevate to `ADMIN`. Four-eyes / dual-control approval for privilege changes is out of v1; last-Administrator protection remains mandatory. Admin idle session timeout is 15 minutes (Auth); absolute session max 12 hours without Remember Me.
- Q: User lifecycle states and admin actions? → A: Canonical account statuses for ops: Pending verification → Active → Suspended → Deactivated (plus Rejected for doctor applicants). Administrators may: search/filter/list; view identity and status; suspend (reason required, ≥10 characters); reinstate/activate when policy allows; deactivate (soft close—no hard delete of PHI-bearing accounts in v1); force sign-out / revoke all sessions; trigger password-reset invite where Auth supports it; unlock lockout after review. Suspended and Deactivated users cannot establish new sessions; existing sessions are revoked on suspend/deactivate. Administrators cannot permanently purge user PHI from this portal in v1 (retention/legal hold handled outside). Self-suspend of the acting admin’s own account is blocked.
- Q: Doctor approval workflow? → A: Lifecycle: Created / Pending Approval → Approved (Active) | Rejected | Suspended | Deactivated. Queue shows pending applicants with identity, credentials/specialty summary, and submission metadata needed to decide. Approve: sets Approved/Active, enables public discovery/booking per platform rules, sends invite/set-password or activation notice per Auth, audits `admin.doctor.approve`. Reject: reason required, doctor remains non-bookable, notice sent, audits `admin.doctor.reject`. Re-application after reject is allowed only via new pending record (no silent flip). Suspend approved doctor: blocks new bookings, hides from public bookable lists, revokes doctor sessions, does not auto-cancel already Confirmed future appointments—instead flags them for ops review and notifies doctor/patients of impact messaging where design supports it; admin may cancel individual appointments via Appointment Management. Approve/reject are idempotent for already-decided records.
- Q: Audit logging (admin)? → A: Append-only, UI-immutable audit for Administration Portal access grants/denials; dashboard/sensitive page views that expose PHI aggregates when policy requires; user status/role changes; doctor create/approve/reject/suspend; appointment cancel/flag by admin; refunds and dispute marks; platform setting changes (including maintenance mode and AI toggles); AI feature disable/enable and flagged-AI review notes; notification announcement publishes; report/audit exports; session revoke by admin; System Health acknowledged incidents when recorded. Each event: actor id, action type, target type/id, outcome, timestamp, request metadata (origin/user-agent) when available, optional reason text. Retention ≥6 years for security and access governance events (stricter than Auth’s ≥365-day floor). Exports are themselves audited. No edit/delete of audit rows from admin UI.
- Q: Platform monitoring & System Health? → A: System Health shows overall status Healthy | Degraded | Down plus component checks: application reachability, primary data store, session store if distinct, payment provider connectivity (when configured), AI provider connectivity (when configured), and telemedicine provider connectivity (when configured). Checks are summary-level (success/fail + last checked time + short message)—not full APM. Dashboard Platform Status mirrors the same overall status. Refresh on page load; manual refresh control if Stitch provides it. No paging/on-call dispatch from the portal in v1.
- Q: Billing & payment workflows? → A: Administrators list transactions with amount, currency, status (e.g., Pending, Paid, Failed, Refunded, Partially refunded, Disputed), payer reference, and linked appointment/order id when present. Full refunds and partial refunds are allowed when payment status is Paid or Partially refunded and remaining refundable balance > 0; reason required; confirmation required; provider refund initiated when integration exists, otherwise status marked Refunded/Partially refunded with manual-settlement note for finance. Already fully refunded → blocked. Dispute mark is status annotation + audit, not a card-network chargeback API. Revenue Summary: gross collected, refunds, net for selectable periods (Today, 7d, 30d, custom range). No ledger, tax engine, or payout-to-doctor settlement calculation in v1 beyond displaying recorded platform payment events.
- Q: AI governance? → A: AI Operations exposes usage volume (requests/period), error/failure counts, and recent operational events. Administrators may enable/disable platform AI features globally (patient assistant, doctor documentation assistant, doctor prescription assistant as distinct toggles when present). Disabled features show clear unavailable messaging in end-user portals. Flagged AI conversations: view metadata and minimized transcript allowed for safety review; mark Reviewed with optional note; do not use review UI to alter clinical signed artifacts. Rate-limit / abuse: admin may temporarily disable AI for a specific user account (reason + audit) in addition to global toggles. AI never auto-approves doctors, never changes billing, never signs clinical artifacts. Production AI vendors with PHI require BAA (operational gate outside day-to-day UI).
- Q: Analytics vs reporting? → A: Analytics = interactive in-portal charts/tables for users (new/active), doctors (pending/approved), appointments (by status), revenue (gross/net), AI usage over selectable periods. Reporting = same domains as downloadable standard artifacts (CSV and/or PDF as design allows) for the selected period. Page size defaults 20 for tabular exports preview; export capped at a safe maximum rows per file (e.g., 10,000) with message to narrow filters if exceeded. No ad-hoc SQL, no custom report builder, no external BI warehouse in v1. Empty periods show empty states, not fabricated zeros that imply outage.
- Q: Notification management? → A: In-portal admin notifications are primary. Categories: doctor approvals, user/security (lockouts, mass failures), billing (payment failures, refunds completed), system health (degraded/down transitions), AI governance (abuse flags). Unread badge; mark one/all read; deep links re-authorize as ADMIN. Retain ≥90 days in-portal. Optional email mirror for high-severity categories (health down, payment failure spikes) using minimal PHI. Platform announcements: Administrators may publish to segments Patient, Doctor, or All when Stitch includes announcements; each publish is audited; announcements are not a substitute for transactional notifications.
- Q: System / platform settings? → A: Settings include at least: maintenance mode (on/off + optional public message), support contact email/phone, global AI feature toggles (mirrored with AI Operations), and other booking/business toggles explicitly present in Stitch. Saves validate required fields; all changes audited with before/after values for scalar settings. Maintenance mode blocks non-admin product use while Administrators retain portal access. Feature toggles take effect for new requests immediately after save (no multi-hour cache lag as a product requirement).
- Q: Security monitoring in the admin experience? → A: Beyond Audit Logs and System Health, Administrators can see security-relevant signals surfaced as notifications and/or a Security section if Stitch provides it: recent failed admin access denials, account lockouts, and refresh-reuse / forced logout events already recorded by Auth. No separate SIEM product inside Hakeem v1; export audit for external SIEM is supported via Audit Log export. Suspicious self-service: admins cannot clear their own audit trail.
- Q: Backup & recovery assumptions? → A: Operational backup and point-in-time recovery of platform data are platform/infrastructure responsibilities outside the Administration Portal UI in v1 (no “Restore from backup” button for admins). RPO target assumption: ≤24 hours for primary data; RTO target assumption: ≤8 hours for critical admin/auth services after declared incident—tracked by ops runbooks, not enforced by this UI. Administrators use System Health and Audit Logs during incidents; destructive recovery actions are runbook/CLI by authorized infrastructure operators, dual-controlled outside this module. Legal hold / export for investigations uses Audit and Reports exports, not raw DB dumps from the portal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Admin Entry & Shell (Priority: P1)

An authenticated Administrator signs in and lands in the Administration Portal shell (navigation, header, locale switcher) matching the approved Stitch design. Non-administrators cannot open any admin route. Session idle follows the Administrator policy (15 minutes).

**Why this priority**: Without gated entry and a navigable shell, no administrative work is possible.

**Independent Test**: Sign in as Administrator and open the portal; sign in as Patient or Doctor and confirm redirect/denial + audit; verify shell matches Stitch chrome; verify idle expiry ends the admin session.

**Acceptance Scenarios**:

1. **Given** a valid Active Administrator session, **When** they open the Administration Portal, **Then** they see the Stitch-aligned shell and can navigate all admin areas.
2. **Given** a Patient or Doctor session (or anonymous visitor), **When** they request any Administration Portal URL, **Then** access is denied, they are sent to an appropriate non-admin destination, and the denial is audited.
3. **Given** an Administrator viewing the portal in Arabic, **When** the layout renders, **Then** navigation and content follow RTL directionality with readable Arabic labels.
4. **Given** an Administrator idle beyond 15 minutes, **When** they attempt a navigation or mutation, **Then** the session is ended and they must re-authenticate.

---

### User Story 2 - Admin Dashboard Overview (Priority: P1)

The Administrator opens the dashboard and sees at-a-glance platform health: Total Patients, Total Doctors, Active Appointments, Revenue Summary, AI Usage Metrics, Platform Status, Pending Doctor Approvals, Recent Activities, and Notifications, plus Quick Actions (Approve Doctor, Suspend User, View Analytics, Manage Platform Settings, Review AI Operations, View Audit Logs). Widget failures are isolated.

**Why this priority**: The dashboard is the operational home and the primary daily entry point.

**Independent Test**: With seeded platform data, open the dashboard and verify each KPI/widget and that each quick action navigates to the correct destination; simulate one widget failure and confirm others still load.

**Acceptance Scenarios**:

1. **Given** an Administrator on the dashboard, **When** the page loads, **Then** all listed KPI widgets and panels appear with current figures (or clear empty/unavailable states).
2. **Given** pending doctor approvals exist, **When** the Administrator views the dashboard, **Then** the Pending Doctor Approvals widget shows a non-zero count and links to the approval queue.
3. **Given** the Administrator uses a Quick Action, **When** they activate it, **Then** they reach the corresponding management surface without leaving the admin experience.
4. **Given** a transient failure loading one widget, **When** the dashboard renders, **Then** other widgets still load and the failed widget shows a safe error with retry.

---

### User Story 3 - User Management (Priority: P1)

The Administrator searches, filters, and opens platform users (patients, doctors, and other accounts), reviews profile and status, and can suspend, reinstate, deactivate, revoke sessions, or unlock lockouts with recorded reasons where required—without hard-deleting PHI accounts.

**Why this priority**: User lifecycle control is core to platform safety and support.

**Independent Test**: Find a test user, suspend them, confirm they cannot sign in and sessions are revoked, reinstate, unlock a lockout, and confirm audit of each action.

**Acceptance Scenarios**:

1. **Given** many users, **When** the Administrator searches by name or email and filters by role or status, **Then** matching users appear in a paginated list (default page size 20).
2. **Given** an active user, **When** the Administrator suspends the account with a reason (≥10 characters), **Then** the user is marked Suspended, sessions are revoked, sign-in is blocked, and the action is audited.
3. **Given** a suspended user, **When** the Administrator reinstates them, **Then** the account returns to Active and the change is recorded.
4. **Given** the Administrator attempts to suspend or deactivate their own account, **When** the action is submitted, **Then** it is blocked with a clear message.
5. **Given** a locked-out user, **When** the Administrator unlocks after review, **Then** failed-login lockout clears, the user may authenticate again, and the unlock is audited.

---

### User Story 4 - Doctor Management & Approvals (Priority: P1)

The Administrator reviews doctor applications and profiles, approves or rejects new doctors, and can suspend or update verified doctor accounts so only approved clinicians appear as bookable.

**Why this priority**: Doctor trust and marketplace quality depend on controlled onboarding.

**Independent Test**: Approve a pending doctor and confirm they become bookable and notified; reject another with reason and confirm non-bookable; suspend an approved doctor and confirm public listing/booking blocked and sessions revoked.

**Acceptance Scenarios**:

1. **Given** pending doctor applications, **When** the Administrator opens Doctor Management, **Then** they see a queue with applicant details needed to decide.
2. **Given** a pending applicant, **When** the Administrator approves them, **Then** the doctor becomes eligible for public discovery/booking per platform rules, activation/invite messaging is sent per Auth rules, and the action is audited.
3. **Given** a pending applicant, **When** the Administrator rejects them with a reason, **Then** the doctor remains non-bookable, the decision is recorded and communicated, and the action is audited.
4. **Given** an approved doctor, **When** the Administrator suspends the doctor account, **Then** new patient bookings are blocked, the doctor is removed from public bookable lists, doctor sessions are revoked, and the change is auditable.
5. **Given** a doctor already approved or rejected, **When** the Administrator repeats the same decision, **Then** the operation is idempotent without duplicate side effects.

---

### User Story 5 - Appointment Oversight (Priority: P2)

The Administrator monitors appointments across the platform (search/filter by status, doctor, patient, date), views details for support, and can cancel or flag problematic appointments according to policy without replacing the doctor’s clinical workflow.

**Why this priority**: Operations needs visibility into care delivery volume and exceptions.

**Independent Test**: Filter today’s appointments, open one detail, cancel a support case with reason, confirm parties are notified and audit exists.

**Acceptance Scenarios**:

1. **Given** appointments across doctors, **When** the Administrator filters by date range and status, **Then** matching appointments list correctly.
2. **Given** a support escalation, **When** the Administrator cancels an appointment with a reason, **Then** status updates, affected parties are notified, and the action is audited.
3. **Given** the Administrator lacks clinical role, **When** they view appointment detail, **Then** they see operational fields needed for support without a full clinical chart editor (clinical editing remains doctor-owned).

---

### User Story 6 - AI Operations Monitoring (Priority: P2)

The Administrator reviews AI usage metrics, recent AI sessions/errors, and can enable/disable AI features globally or for a specific user, and review flagged conversations under AI governance policy.

**Why this priority**: AI is a product differentiator and a risk surface that needs operational control.

**Independent Test**: Open AI Operations, view usage summary, disable a global AI feature, confirm end-user AI entry reflects the change; disable AI for one user and confirm only that user is blocked.

**Acceptance Scenarios**:

1. **Given** AI activity on the platform, **When** the Administrator opens AI Operations, **Then** they see usage metrics and recent operational events (successes, failures, volume).
2. **Given** a policy decision, **When** the Administrator disables an AI feature globally, **Then** patient/doctor AI entry points respect the disabled state with a clear message and the change is audited.
3. **Given** a flagged AI conversation, **When** the Administrator reviews it, **Then** they can mark it reviewed and record an operational note without altering signed clinical records.
4. **Given** abusive AI usage by one account, **When** the Administrator disables AI for that user with a reason, **Then** only that user’s AI entry is blocked and the action is audited.

---

### User Story 7 - Billing, Payments & Revenue (Priority: P2)

The Administrator views billing transactions, payment status, refunds, and revenue summaries; initiates permitted full or partial refunds or marks disputes; and exports period revenue reports for finance review.

**Why this priority**: Financial integrity and support for payment issues are business-critical.

**Independent Test**: Locate a paid transaction, issue a refund (or simulated refund in test), confirm balances/status update and audit; open Payment & Revenue summary for a date range; attempt refund on already-refunded and confirm block.

**Acceptance Scenarios**:

1. **Given** completed payments, **When** the Administrator filters Billing & Transactions, **Then** they see amounts, currency, status, payer, and related appointment/order references.
2. **Given** an eligible paid transaction with remaining refundable balance, **When** the Administrator issues a full or partial refund with a reason, **Then** payment status updates, the user is notified, and the action is audited.
3. **Given** a date range, **When** the Administrator opens Payment & Revenue, **Then** they see aggregated gross, refunds, and net figures suitable for operational review.
4. **Given** a fully refunded transaction, **When** the Administrator attempts another refund, **Then** the action is blocked with a clear message.

---

### User Story 8 - Reports & Analytics (Priority: P2)

The Administrator opens Reports & Analytics to view trends (users, doctors, appointments, revenue, AI usage) over selectable periods and exports standard CSV/PDF reports within row-cap limits.

**Why this priority**: Leadership and ops need evidence-based decisions beyond the dashboard snapshot.

**Independent Test**: Select last 30 days, confirm charts/tables populate, export a report file, open it successfully; exceed row cap and confirm guidance to narrow filters.

**Acceptance Scenarios**:

1. **Given** historical platform activity, **When** the Administrator selects a period, **Then** analytics views update to that period.
2. **Given** an analytics view, **When** the Administrator exports a standard report, **Then** a downloadable artifact is produced with the selected period’s data and the export is audited.
3. **Given** empty periods, **When** analytics loads, **Then** empty states appear instead of incorrect zeros that imply data loss.
4. **Given** a filter that would exceed the export row cap, **When** export is requested, **Then** the system refuses or truncates with a clear message to narrow filters.

---

### User Story 9 - Platform Settings (Priority: P2)

The Administrator configures platform-wide settings (maintenance mode, support contact, AI and other feature toggles, booking/business rules exposed for ops) matching Stitch settings screens; changes are audited with before/after values.

**Why this priority**: Runtime configuration reduces emergency releases for common ops changes.

**Independent Test**: Toggle a setting, save, reload, confirm persistence and end-user effect; enable maintenance mode and confirm non-admin block vs admin access.

**Acceptance Scenarios**:

1. **Given** the Administrator opens Platform Settings, **When** they change an allowed setting and save, **Then** the value persists, takes effect for new requests, is audited, and is reflected on subsequent visits.
2. **Given** maintenance mode is enabled, **When** non-admin users try to use the product, **Then** they see a maintenance experience while Administrators retain portal access.
3. **Given** invalid input (e.g., empty required contact), **When** the Administrator saves, **Then** validation errors prevent save and explain what to fix.

---

### User Story 10 - System Health & Platform Monitoring (Priority: P2)

The Administrator opens System Health to see platform status (overall Healthy/Degraded/Down), dependency checks, recent error indicators, and last successful check time—aligned with the dashboard Platform Status widget.

**Why this priority**: Early detection of outages protects patients and clinicians.

**Independent Test**: With healthy dependencies, status shows Healthy; simulate a failed check in test and confirm Degraded/Down presentation; confirm dashboard status matches.

**Acceptance Scenarios**:

1. **Given** a healthy platform, **When** System Health loads, **Then** overall status is Healthy and component checks show success with last-checked times.
2. **Given** a failed dependency check, **When** System Health loads, **Then** overall status is Degraded or Down with the failing component identified.
3. **Given** the dashboard Platform Status widget, **When** health changes, **Then** the dashboard reflects the same high-level status as System Health.
4. **Given** a transition to Degraded or Down, **When** notifications are enabled for health, **Then** Administrators receive an operational notification.

---

### User Story 11 - Audit Logs (Priority: P1)

The Administrator searches immutable audit events for security and compliance (who did what, when, on which subject), filters by actor/action/date, and exports results for investigations; exports are audited and rows cannot be edited.

**Why this priority**: Healthcare platforms require accountable admin actions.

**Independent Test**: Perform a suspend-user action, find the matching audit row, export a filtered set, confirm export audit exists and UI has no edit/delete.

**Acceptance Scenarios**:

1. **Given** audited admin actions have occurred, **When** the Administrator filters Audit Logs by actor and date, **Then** matching events appear with actor, action, target, outcome, timestamp, and reason when applicable.
2. **Given** a sensitive action (approve doctor, refund, role change, settings change), **When** it completes, **Then** an audit event exists that cannot be edited or deleted from the UI.
3. **Given** an investigation, **When** the Administrator exports filtered logs, **Then** a downloadable artifact matches the on-screen filter and the export itself is audited.

---

### User Story 12 - Admin Notifications & Announcements (Priority: P3)

The Administrator receives operational notifications (pending approvals, payment failures, health alerts, AI flags, security lockouts) and can mark them read; when Stitch includes announcements, they may publish to Patient, Doctor, or All segments.

**Why this priority**: Keeps admins responsive without constant dashboard polling; announcements are secondary.

**Independent Test**: Trigger a pending-approval notification, open Notifications, mark read; publish a test announcement to a small segment if in design; confirm audit.

**Acceptance Scenarios**:

1. **Given** unread admin notifications, **When** the Administrator opens Notifications, **Then** items list with unread indicators and deep links that re-check ADMIN authorization.
2. **Given** an unread item, **When** marked read (one or all), **Then** unread count decreases.
3. **Given** announcement capability in the approved design, **When** the Administrator publishes an announcement to a segment, **Then** targeted users receive it and the send is audited.

---

### User Story 13 - Role & Permission Management (Priority: P2)

The Administrator reviews platform roles (Patient, Doctor, Administrator), assigns/revokes Administrator (and other primary roles per Auth), and invites additional Administrators—without four-eyes dual control in v1, but with last-admin and self-lockout guardrails.

**Why this priority**: Unauthorized privilege changes are a critical security risk.

**Independent Test**: Promote a user to Administrator, confirm portal access; attempt to demote the last Administrator and confirm block; confirm OAuth cannot self-elevate.

**Acceptance Scenarios**:

1. **Given** Role & Permission Management, **When** the Administrator views roles, **Then** they see defined roles and their high-level capabilities.
2. **Given** an Active Administrator, **When** they assign Administrator role to an eligible user (or send an admin invite) with confirmation, **Then** the change takes effect per Auth rules and is audited.
3. **Given** an attempt to demote or deactivate the last Active Administrator, **When** the action is submitted, **Then** it is blocked (`LAST_ADMIN` guardrail).
4. **Given** a non-Administrator authenticated via any identity provider, **When** they present IdP claims implying admin, **Then** those claims do not grant Administration Portal access.

---

### Edge Cases

- Administrator session expires mid-action: save fails safely; user re-authenticates; no partial corrupt state.
- Concurrent two-admin edits on the same user/settings: last successful write wins with clear confirmation; conflicts surface when possible.
- Approving an already-approved doctor: idempotent success, no duplicate side effects.
- Rejecting an already-rejected doctor: idempotent; no duplicate notifications storm.
- Refund on already-fully-refunded transaction: blocked with clear message.
- Partial refund exceeding remaining balance: blocked with clear message.
- Empty platform (no users/appointments): dashboards and lists show empty states, not errors.
- Extremely large audit/transaction tables: pagination and filters remain usable; exports enforce row caps.
- Locale switch mid-form: unsaved changes warn or preserve draft where feasible.
- Maintenance mode on: admins retain access; public/patient/doctor surfaces show maintenance messaging.
- Self-lockout: an Administrator cannot remove their own last admin privilege, suspend themselves, or leave zero Administrators.
- Widget isolation: one dashboard widget failure does not blank the entire dashboard.
- Doctor suspend with future Confirmed appointments: new bookings blocked; existing future appointments flagged for ops—not silently deleted.
- AI disabled globally while a user has an open AI session: new generations fail closed with clear message; no clinical auto-write.
- Backup/restore is not available in-portal; admins must not be offered destructive “wipe and restore” controls in v1.
- Access denial for non-admins does not reveal whether a specific admin-only resource id exists (anti-enumeration for sensitive targets where applicable).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow only authenticated Active Administrators to access Administration Portal routes and actions.
- **FR-002**: System MUST deny Patients, Doctors, and anonymous users from admin surfaces with a clear non-admin outcome; denials MUST be audited.
- **FR-003**: Administration Portal UI MUST match the approved Stitch MCP design (layout, hierarchy, key components); teams MUST NOT redesign screens.
- **FR-004**: Portal MUST support English and Arabic, including RTL layout for Arabic.
- **FR-005**: Portal MUST be usable on common desktop and mobile viewport widths (responsive), matching Stitch breakpoints where provided.
- **FR-006**: Interactive admin controls MUST meet accessibility expectations (keyboard operable, visible focus, labeled controls, sufficient contrast); target WCAG 2.2 AA for primary flows where feasible within Stitch constraints.
- **FR-007**: Admin Dashboard MUST display: Total Patients, Total Doctors, Active Appointments, Revenue Summary, AI Usage Metrics, Platform Status, Pending Doctor Approvals, Recent Activities, and Notifications.
- **FR-008**: Dashboard MUST expose Quick Actions: Approve Doctor, Suspend User, View Analytics, Manage Platform Settings, Review AI Operations, View Audit Logs — each navigating to the correct area.
- **FR-009**: System MUST provide User Management: search, filter, view, suspend (reason required), reinstate, deactivate (soft), unlock lockout, and revoke sessions; MUST NOT hard-delete PHI-bearing accounts from this portal in v1.
- **FR-010**: System MUST provide Doctor Management including pending approval queue, approve, reject (with reason), and suspend approved doctors (block new bookings, hide from bookable lists, revoke doctor sessions).
- **FR-011**: Approving a doctor MUST make them eligible for public discovery/booking per platform rules and trigger Auth invite/activation messaging; rejection/suspension MUST prevent new bookings as applicable.
- **FR-012**: System MUST provide Appointment Management for cross-platform monitoring, detail view, and policy-allowed cancel/flag actions with audit; MUST NOT provide clinical chart editing or digital clinical signing to admins.
- **FR-013**: System MUST provide AI Operations views for usage metrics, operational events, global AI feature enable/disable, per-user AI disable, and review of flagged AI activity without altering signed clinical artifacts.
- **FR-014**: System MUST provide Billing & Transactions listing with amount, currency, status, payer, and related references.
- **FR-015**: System MUST provide Payment & Revenue summaries (gross, refunds, net) over selectable periods and support permitted full/partial refunds with reasons, confirmation, and audit; MUST block refunds when no refundable balance remains.
- **FR-016**: System MUST provide Reports & Analytics for users, doctors, appointments, revenue, and AI usage with period selection and standard export (CSV and/or PDF); exports MUST enforce a maximum row cap with clear messaging.
- **FR-017**: System MUST provide Platform Settings for operational configuration (including maintenance mode, support contact, and feature toggles exposed to ops); setting changes MUST be audited with before/after values for scalar settings.
- **FR-018**: When maintenance mode is on, non-admin product use MUST be blocked or informed while Administrators retain portal access.
- **FR-019**: System MUST provide System Health showing overall status (Healthy | Degraded | Down) and component/dependency check results aligned with dashboard Platform Status; components MUST include application, primary data store, and configured critical integrations (payments, AI, telemedicine when enabled).
- **FR-020**: System MUST provide searchable, filterable, exportable Audit Logs for sensitive administrative and security-relevant actions; audit records MUST NOT be editable or deletable from the admin UI; audit retention MUST be ≥6 years for security/access governance events; exports of audit data MUST themselves be audited.
- **FR-021**: System MUST provide admin Notifications (list, unread state, mark one/all read, deep links) for operational events including approvals, billing failures, health transitions, AI flags, and security lockouts; in-portal retention ≥90 days.
- **FR-022**: System MUST provide Role & Permission Management to view roles and assign/revoke primary platform roles (especially Administrator) and admin invites with confirmation and audit; IdP claims MUST NOT grant `ADMIN`.
- **FR-023**: System MUST prevent the last remaining Active Administrator from being demoted, suspended, or deactivated; MUST prevent an Administrator from suspending/deactivating their own account.
- **FR-024**: Sensitive actions (suspend/deactivate user, unlock, approve/reject/suspend doctor, refund, role change, settings that affect availability, AI disable, announcement publish) MUST require confirmation and produce an audit event.
- **FR-025**: Admin lists that can grow large MUST support pagination (default page size 20) and empty/error states.
- **FR-026**: Failed admin mutations MUST show actionable errors without silent failure and without leaking stack traces or unnecessary PHI.
- **FR-027**: Administrators MUST be able to sign out from the portal shell; sign-out MUST revoke the server session.
- **FR-028**: Clinical chart editing and digital clinical signing remain outside admin scope; admins get operational oversight only.
- **FR-029**: Administrator session idle timeout MUST be 15 minutes and absolute session lifetime without Remember Me MUST be 12 hours, consistent with Auth & RBAC.
- **FR-030**: Dashboard widgets MUST fail in isolation (one widget error MUST NOT blank the entire dashboard).
- **FR-031**: Doctor approve/reject operations MUST be idempotent for already-decided applications.
- **FR-032**: Dispute marking on a transaction MUST be an annotated status + audit, not a card-network chargeback execution.
- **FR-033**: When Stitch includes platform announcements, Administrators MUST be able to publish to segments Patient, Doctor, or All with audit; when Stitch does not, announcement UI is omitted without blocking other notification requirements.
- **FR-034**: Security monitoring in v1 MUST surface Auth security signals (failed admin access, lockouts, forced logouts) via Audit Logs and/or Notifications; full SIEM is out of portal scope but audit export MUST support external SIEM ingestion.
- **FR-035**: Backup and point-in-time restore MUST NOT be exposed as Administration Portal actions in v1; recovery remains an infrastructure runbook concern with assumed RPO ≤24 hours and RTO ≤8 hours for critical auth/admin services.
- **FR-036**: Suspend reason and doctor reject reason MUST require meaningful text (minimum 10 characters) before submit.
- **FR-037**: AI governance toggles and per-user AI disables MUST fail closed (deny AI generations when disabled or unconfirmed).
- **FR-038**: Every primary admin list/detail/settings surface MUST provide empty, loading, and error states consistent with Stitch patterns.

### Key Entities *(include if feature involves data)*

- **Administrator**: Authenticated user with primary role `ADMIN` and Active status operating the portal.
- **Platform User**: Any account (`PATIENT` | `DOCTOR` | `ADMIN`) manageable from User Management, with lifecycle status (Pending verification, Active, Suspended, Deactivated, Rejected as applicable).
- **Doctor Application / Doctor Account**: Clinician profile subject to Pending Approval → Approved | Rejected | Suspended | Deactivated.
- **Appointment (ops view)**: Cross-tenant appointment record for monitoring and support actions (cancel/flag)—not a clinical chart.
- **AI Operations Event**: Usage aggregate, failure, or flagged AI session for ops review.
- **AI Feature Toggle**: Named global switch controlling patient/doctor AI surfaces.
- **Billing Transaction**: Payment, refund, or related money movement with amount, currency, status, payer, and references.
- **Revenue Summary**: Aggregated gross, refunds, and net metrics for a period.
- **Platform Setting**: Named configuration value controlling platform behavior (including maintenance mode), with audited before/after on change.
- **System Health Status**: Overall Healthy | Degraded | Down plus per-component check results and last-checked time.
- **Audit Log Entry**: Append-only record of who/what/when/subject/outcome/reason for compliance (≥6 year retention for security/access events).
- **Admin Notification**: Operational alert for administrators (approvals, billing, health, AI, security) with read state.
- **Role / Permission Grant**: Primary platform role assignment controlling portal access; v1 full admin capability for all Active `ADMIN` users.
- **Platform Announcement**: Optional broadcast message to Patient, Doctor, or All segments when present in Stitch.
- **Report Export**: Downloadable analytics/audit artifact for a filter/period, itself audited when produced.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of Administrators reach the dashboard and identify Pending Doctor Approvals within 30 seconds of landing in a usability test.
- **SC-002**: Administrators complete doctor approve or reject (including reason when rejecting) in under 2 minutes for a typical application.
- **SC-003**: Administrators suspend a user with reason in under 1 minute from search start.
- **SC-004**: 100% of sensitive admin actions sampled in audit review produce a corresponding audit log entry; 100% of sampled audit exports also produce an export audit event.
- **SC-005**: Dashboard KPI widgets load to a usable state within 3 seconds on a standard office connection for typical data volumes; a single widget failure does not blank others in 100% of fault-injection tests.
- **SC-006**: Non-administrators attempting admin URLs are denied in 100% of automated access tests; denials appear in audit samples.
- **SC-007**: Arabic locale presents RTL navigation and readable labels on all primary admin screens in bilingual QA.
- **SC-008**: Primary admin flows remain keyboard-completable in accessibility spot-checks (dashboard, user suspend, doctor approve).
- **SC-009**: Visual QA against approved Stitch screens for shell + dashboard + at least three management pages reports no material layout deviations.
- **SC-010**: Enabling maintenance mode blocks non-admin product use while admins retain portal access in verification tests.
- **SC-011**: Refund of an eligible transaction completes with updated status and user-visible confirmation within one admin session; fully refunded retries are blocked in 100% of tests.
- **SC-012**: Export of a filtered audit or analytics report succeeds for periods with data in ≥95% of test attempts within the row cap.
- **SC-013**: Last-Administrator demotion/suspend/deactivate attempts are blocked in 100% of automated guardrail tests.
- **SC-014**: Global AI disable prevents new AI generations on patient and doctor surfaces in verification tests within one admin session after save.
- **SC-015**: System Health overall status matches dashboard Platform Status in 100% of paired refresh checks during QA.
- **SC-016**: Administrator idle timeout of 15 minutes ends the session in timed acceptance tests consistent with Auth policy.

## Assumptions

- Authentication, sessions, primary roles (`PATIENT` | `DOCTOR` | `ADMIN`), last-admin protection, doctor provisioning APIs, and base auth audit events already exist from Auth & RBAC; this feature builds the admin experience on that foundation.
- Approved Stitch MCP screens for the Administration Portal are available and are the visual/UX source of truth.
- Admin idle timeout is 15 minutes and absolute max 12 hours without Remember Me (Auth policy).
- v1 grants full Administration Portal capability to every Active `ADMIN`; fine-grained custom admin roles / four-eyes dual control are deferred unless Stitch mandates otherwise.
- “Active Appointments” means appointments in non-terminal states relevant to ops (e.g., Confirmed, Checked in, In progress), not historical completed volume.
- Revenue Summary and billing views use the platform’s existing payment records; payment-provider settlement files and doctor payout ledgers are out of scope unless already integrated.
- Refunds: full and partial against remaining refundable balance; chargeback network execution is out of scope beyond Dispute status annotation.
- Admin appointment cancel is for support/ops exceptions; routine clinical scheduling remains with doctors/patients.
- Admins do not edit SOAP notes, sign prescriptions, or act as the treating clinician.
- Suspending a doctor blocks new bookings and public bookable listing; existing future Confirmed appointments are flagged for ops follow-up rather than auto-cancelled en masse.
- User “delete” in v1 means soft deactivate; hard purge of PHI is out of portal scope (legal/retention process).
- Platform announcements are included if present in Stitch; otherwise notifications are inbound-ops only.
- System Health checks cover application, primary data store, and configured critical integrations at summary level—not a full APM/NOC suite.
- Audit retention ≥6 years for security/access governance events (aligns with healthcare-oriented retention used in other Hakeem modules); Auth’s ≥365-day floor is a minimum, not a ceiling.
- Security monitoring in-portal = Audit Logs + Notifications for Auth security signals; external SIEM consumes exports.
- Backup & recovery: infrastructure-owned; assumed RPO ≤24 hours, RTO ≤8 hours for critical auth/admin services; no in-portal restore UI.
- AI vendors processing PHI require BAA before production; admin UI enforces operational toggles, not legal contracting.
- Analytics/reporting are canned only; export row cap (e.g., 10,000 rows) protects portal and browser resources.
- Default list pagination page size is 20 unless Stitch specifies otherwise.
- Seed/demo Administrator accounts exist for development and QA.
- Accessibility target for v1 is WCAG 2.2 AA for primary flows where feasible within approved design constraints.
- HIPAA-ready means architectural and procedural readiness (audit, access control, encryption, BAA gates)—not a claim of HIPAA certification.
- Localization catalogs for English and Arabic admin copy will be maintained alongside implementation.

## Dependencies

- Existing authentication and role enforcement (Administrator), including idle/absolute session policy and last-admin guardrails.
- Existing user, doctor, appointment, payment, AI, and notification domain data from prior modules.
- Auth audit event types for admin user/doctor lifecycle (extended by this module for settings, refunds, AI governance, exports, health-related admin actions).
- Approved Stitch Administration Portal designs.
- Localization catalogs for English and Arabic admin copy.
- Public website / patient / doctor surfaces that honor doctor approval, suspension, maintenance mode, and AI feature toggles.
- Infrastructure backup/restore runbooks (outside this module) for incident recovery assumptions.

## Out of Scope

- Redesigning UI away from approved Stitch screens.
- Building a separate mobile-native admin app.
- Full ERP/accounting system replacement (general ledger, payroll, tax filing, doctor payout settlement engine).
- Direct clinical care delivery by administrators.
- Patient or doctor self-service portals (covered by other modules).
- Real-time NOC war-room tooling, paging, or on-call dispatch beyond System Health summary and notifications.
- Custom report builder / BI warehouse / ad-hoc SQL.
- In-portal database backup, restore, or destructive recovery controls.
- Full SIEM product embedded in Hakeem.
- Four-eyes / dual-control privilege workflows (deferred).
- Fine-grained custom admin role builder (deferred unless Stitch requires it).
- Hard delete / physical PHI purge from the Administration Portal.
- Card-network chargeback execution APIs.
- Legal e-discovery tooling beyond exportable audit/analytics artifacts.
- HIPAA certification engagement (architecture is HIPAA-ready only).
