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

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Admin Entry & Shell (Priority: P1)

An authenticated Administrator signs in and lands in the Administration Portal shell (navigation, header, locale switcher) matching the approved Stitch design. Non-administrators cannot open any admin route.

**Why this priority**: Without gated entry and a navigable shell, no administrative work is possible.

**Independent Test**: Sign in as Administrator and open the portal; sign in as Patient or Doctor and confirm redirect/denial; verify shell matches Stitch chrome.

**Acceptance Scenarios**:

1. **Given** a valid Administrator session, **When** they open the Administration Portal, **Then** they see the Stitch-aligned shell and can navigate all admin areas.
2. **Given** a Patient or Doctor session (or anonymous visitor), **When** they request any Administration Portal URL, **Then** access is denied and they are sent to an appropriate non-admin destination.
3. **Given** an Administrator viewing the portal in Arabic, **When** the layout renders, **Then** navigation and content follow RTL directionality with readable Arabic labels.

---

### User Story 2 - Admin Dashboard Overview (Priority: P1)

The Administrator opens the dashboard and sees at-a-glance platform health: Total Patients, Total Doctors, Active Appointments, Revenue Summary, AI Usage Metrics, Platform Status, Pending Doctor Approvals, Recent Activities, and Notifications, plus Quick Actions (Approve Doctor, Suspend User, View Analytics, Manage Platform Settings, Review AI Operations, View Audit Logs).

**Why this priority**: The dashboard is the operational home and the primary daily entry point.

**Independent Test**: With seeded platform data, open the dashboard and verify each KPI/widget and that each quick action navigates to the correct destination.

**Acceptance Scenarios**:

1. **Given** an Administrator on the dashboard, **When** the page loads, **Then** all listed KPI widgets and panels appear with current figures (or clear empty/unavailable states).
2. **Given** pending doctor approvals exist, **When** the Administrator views the dashboard, **Then** the Pending Doctor Approvals widget shows a non-zero count and links to the approval queue.
3. **Given** the Administrator uses a Quick Action, **When** they activate it, **Then** they reach the corresponding management surface without leaving the admin experience.

---

### User Story 3 - User Management (Priority: P1)

The Administrator searches, filters, and opens platform users (patients, doctors, and other accounts), reviews profile and status, and can suspend, reinstate, or update account status with a recorded reason where required.

**Why this priority**: User lifecycle control is core to platform safety and support.

**Independent Test**: Find a test user, suspend them, confirm they cannot use restricted features, reinstate, and confirm audit of the action.

**Acceptance Scenarios**:

1. **Given** many users, **When** the Administrator searches by name or email and filters by role or status, **Then** matching users appear in a paginated list.
2. **Given** an active user, **When** the Administrator suspends the account with a reason, **Then** the user is marked suspended, cannot sign in (or is forced out), and the action is auditable.
3. **Given** a suspended user, **When** the Administrator reinstates them, **Then** the account returns to active and the change is recorded.

---

### User Story 4 - Doctor Management & Approvals (Priority: P1)

The Administrator reviews doctor applications and profiles, approves or rejects new doctors, and can suspend or update verified doctor accounts so only approved clinicians appear as bookable.

**Why this priority**: Doctor trust and marketplace quality depend on controlled onboarding.

**Independent Test**: Approve a pending doctor and confirm they become bookable; reject another and confirm they remain non-bookable; suspend an approved doctor and confirm public listing behavior updates.

**Acceptance Scenarios**:

1. **Given** pending doctor applications, **When** the Administrator opens Doctor Management, **Then** they see a queue with applicant details needed to decide.
2. **Given** a pending applicant, **When** the Administrator approves them, **Then** the doctor becomes eligible for public discovery/booking per platform rules and the applicant is notified.
3. **Given** a pending applicant, **When** the Administrator rejects them with a reason, **Then** the doctor remains non-bookable and the decision is recorded and communicated.
4. **Given** an approved doctor, **When** the Administrator suspends the doctor account, **Then** new patient bookings are blocked and the change is auditable.

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

The Administrator reviews AI usage metrics, recent AI sessions/errors, and can enable/disable AI features or throttle/flag abusive usage according to platform policy.

**Why this priority**: AI is a product differentiator and a risk surface that needs operational control.

**Independent Test**: Open AI Operations, view usage summary, disable a feature flag for AI chat, confirm end-user AI entry reflects the change.

**Acceptance Scenarios**:

1. **Given** AI activity on the platform, **When** the Administrator opens AI Operations, **Then** they see usage metrics and recent operational events (successes, failures, volume).
2. **Given** a policy decision, **When** the Administrator disables an AI feature, **Then** patient/doctor AI entry points respect the disabled state with a clear message.
3. **Given** a flagged AI conversation, **When** the Administrator reviews it, **Then** they can mark it reviewed and record an operational note without altering clinical records improperly.

---

### User Story 7 - Billing, Payments & Revenue (Priority: P2)

The Administrator views billing transactions, payment status, refunds, and revenue summaries; initiates permitted refunds or marks disputes; and exports period revenue reports for finance review.

**Why this priority**: Financial integrity and support for payment issues are business-critical.

**Independent Test**: Locate a paid transaction, issue a refund (or simulated refund in test), confirm balances/status update and audit; open Payment & Revenue summary for a date range.

**Acceptance Scenarios**:

1. **Given** completed payments, **When** the Administrator filters Billing & Transactions, **Then** they see amounts, status, payer, and related appointment/order references.
2. **Given** an eligible paid transaction, **When** the Administrator issues a refund with a reason, **Then** payment status updates, the user is notified, and the action is audited.
3. **Given** a date range, **When** the Administrator opens Payment & Revenue, **Then** they see aggregated revenue, refunds, and net figures suitable for operational review.

---

### User Story 8 - Reports & Analytics (Priority: P2)

The Administrator opens Reports & Analytics to view trends (users, doctors, appointments, revenue, AI usage) over selectable periods and exports standard reports.

**Why this priority**: Leadership and ops need evidence-based decisions beyond the dashboard snapshot.

**Independent Test**: Select last 30 days, confirm charts/tables populate, export a report file, open it successfully.

**Acceptance Scenarios**:

1. **Given** historical platform activity, **When** the Administrator selects a period, **Then** analytics views update to that period.
2. **Given** an analytics view, **When** the Administrator exports a standard report, **Then** a downloadable artifact is produced with the selected period’s data.
3. **Given** empty periods, **When** analytics loads, **Then** empty states appear instead of incorrect zeros that imply data loss.

---

### User Story 9 - Platform Settings (Priority: P2)

The Administrator configures platform-wide settings (e.g., maintenance mode, support contact, feature toggles, booking/business rules exposed for ops) matching Stitch settings screens.

**Why this priority**: Runtime configuration reduces emergency releases for common ops changes.

**Independent Test**: Toggle a setting, save, reload, confirm persistence and end-user effect where applicable.

**Acceptance Scenarios**:

1. **Given** the Administrator opens Platform Settings, **When** they change an allowed setting and save, **Then** the value persists and is reflected on subsequent visits.
2. **Given** maintenance mode is enabled, **When** non-admin users try to use the product, **Then** they see a maintenance experience while Administrators retain portal access.
3. **Given** invalid input (e.g., empty required contact), **When** the Administrator saves, **Then** validation errors prevent save and explain what to fix.

---

### User Story 10 - System Health (Priority: P2)

The Administrator opens System Health to see platform status (overall healthy/degraded/down), dependency checks, recent error rates or incident indicators, and last successful check time.

**Why this priority**: Early detection of outages protects patients and clinicians.

**Independent Test**: With healthy dependencies, status shows healthy; simulate a failed check in test and confirm degraded presentation and guidance.

**Acceptance Scenarios**:

1. **Given** a healthy platform, **When** System Health loads, **Then** overall status is healthy and component checks show success.
2. **Given** a failed dependency check, **When** System Health loads, **Then** overall status is degraded or down with the failing component identified.
3. **Given** the dashboard Platform Status widget, **When** health changes, **Then** the dashboard reflects the same high-level status as System Health.

---

### User Story 11 - Audit Logs (Priority: P1)

The Administrator searches immutable audit events for security and compliance (who did what, when, on which subject), filters by actor/action/date, and exports results for investigations.

**Why this priority**: Healthcare platforms require accountable admin actions.

**Independent Test**: Perform a suspend-user action, find the matching audit row, export a filtered set.

**Acceptance Scenarios**:

1. **Given** audited admin actions have occurred, **When** the Administrator filters Audit Logs by actor and date, **Then** matching events appear with sufficient detail to investigate.
2. **Given** a sensitive action (approve doctor, refund, role change), **When** it completes, **Then** an audit event exists that cannot be edited from the UI.
3. **Given** an investigation, **When** the Administrator exports filtered logs, **Then** a downloadable artifact matches the on-screen filter.

---

### User Story 12 - Admin Notifications (Priority: P3)

The Administrator receives operational notifications (pending approvals, payment failures, health alerts) and can mark them read; optionally send platform announcements to user segments when policy allows.

**Why this priority**: Keeps admins responsive without constant dashboard polling; announcements are secondary.

**Independent Test**: Trigger a pending-approval notification, open Notifications, mark read; if announcements are in scope, send a test announcement to a small segment.

**Acceptance Scenarios**:

1. **Given** unread admin notifications, **When** the Administrator opens Notifications, **Then** items list with unread indicators and deep links.
2. **Given** an unread item, **When** marked read, **Then** unread count decreases.
3. **Given** announcement permission, **When** the Administrator publishes an announcement to a segment, **Then** targeted users receive it and the send is audited.

---

### User Story 13 - Role & Permission Management (Priority: P2)

The Administrator reviews roles (Patient, Doctor, Administrator) and manages which administrators (or admin capability grants) may perform sensitive actions, preventing privilege escalation without dual control where required.

**Why this priority**: Unauthorized privilege changes are a critical security risk.

**Independent Test**: Grant a limited admin capability, confirm allowed action works and disallowed action is blocked; attempt self-escalation path is denied or requires second admin (per assumptions).

**Acceptance Scenarios**:

1. **Given** Role & Permission Management, **When** the Administrator views roles, **Then** they see defined roles and their high-level capabilities.
2. **Given** permission to manage roles, **When** they assign Administrator role to a user (or grant a capability), **Then** the change takes effect after confirmation and is audited.
3. **Given** an Administrator without permission-management rights, **When** they attempt to change roles, **Then** the action is denied.

---

### Edge Cases

- Administrator session expires mid-action: save fails safely; user re-authenticates; no partial corrupt state.
- Concurrent two-admin edits on the same user/settings: last successful write wins with clear confirmation; conflicts surface when possible.
- Approving an already-approved doctor: idempotent success, no duplicate side effects.
- Refund on already-refunded transaction: blocked with clear message.
- Empty platform (no users/appointments): dashboards and lists show empty states, not errors.
- Extremely large audit/transaction tables: pagination and filters remain usable.
- Locale switch mid-form: unsaved changes warn or preserve draft where feasible.
- Maintenance mode on: admins retain access; public/patient/doctor surfaces show maintenance messaging.
- Self-lockout: an Administrator cannot remove their own last admin privilege in a way that leaves zero administrators (guardrail).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow only authenticated Administrators to access Administration Portal routes and actions.
- **FR-002**: System MUST deny Patients, Doctors, and anonymous users from admin surfaces with a clear non-admin outcome.
- **FR-003**: Administration Portal UI MUST match the approved Stitch MCP design (layout, hierarchy, key components); teams MUST NOT redesign screens.
- **FR-004**: Portal MUST support English and Arabic, including RTL layout for Arabic.
- **FR-005**: Portal MUST be usable on common desktop and mobile viewport widths (responsive), matching Stitch breakpoints where provided.
- **FR-006**: Interactive admin controls MUST meet accessibility expectations (keyboard operable, visible focus, labeled controls, sufficient contrast).
- **FR-007**: Admin Dashboard MUST display: Total Patients, Total Doctors, Active Appointments, Revenue Summary, AI Usage Metrics, Platform Status, Pending Doctor Approvals, Recent Activities, and Notifications.
- **FR-008**: Dashboard MUST expose Quick Actions: Approve Doctor, Suspend User, View Analytics, Manage Platform Settings, Review AI Operations, View Audit Logs — each navigating to the correct area.
- **FR-009**: System MUST provide User Management: search, filter, view, suspend, and reinstate users with reasons when suspending.
- **FR-010**: System MUST provide Doctor Management including pending approval queue, approve, reject (with reason), and suspend approved doctors.
- **FR-011**: Approving a doctor MUST make them eligible for public discovery/booking per platform rules; rejection/suspension MUST prevent new bookings as applicable.
- **FR-012**: System MUST provide Appointment Management for cross-platform monitoring, detail view, and policy-allowed cancel/flag actions with audit.
- **FR-013**: System MUST provide AI Operations views for usage metrics, operational events, feature enable/disable, and review of flagged AI activity.
- **FR-014**: System MUST provide Billing & Transactions listing with status, amounts, and related references.
- **FR-015**: System MUST provide Payment & Revenue summaries over selectable periods and support permitted refunds with reasons and audit.
- **FR-016**: System MUST provide Reports & Analytics for users, doctors, appointments, revenue, and AI usage with period selection and export.
- **FR-017**: System MUST provide Platform Settings for operational configuration (including maintenance mode and feature toggles exposed to ops).
- **FR-018**: When maintenance mode is on, non-admin product use MUST be blocked or informed while Administrators retain portal access.
- **FR-019**: System MUST provide System Health showing overall status and component/dependency check results aligned with dashboard Platform Status.
- **FR-020**: System MUST provide searchable, filterable, exportable Audit Logs for sensitive administrative and security-relevant actions; audit records MUST NOT be editable from the admin UI.
- **FR-021**: System MUST provide admin Notifications (list, unread state, mark read, deep links) for operational events.
- **FR-022**: System MUST provide Role & Permission Management to view roles and assign/revoke administrator privileges (or admin capabilities) with confirmation and audit.
- **FR-023**: System MUST prevent the last remaining Administrator from being demoted/removed (self-lockout guardrail).
- **FR-024**: Sensitive actions (suspend user, approve/reject doctor, refund, role change, settings that affect availability, AI disable) MUST require confirmation and produce an audit event.
- **FR-025**: Admin lists that can grow large MUST support pagination (or equivalent progressive loading) and empty/error states.
- **FR-026**: Failed admin mutations MUST show actionable errors without silent failure.
- **FR-027**: Administrators MUST be able to sign out from the portal shell.
- **FR-028**: Clinical chart editing and digital clinical signing remain outside admin scope; admins get operational oversight only.

### Key Entities *(include if feature involves data)*

- **Administrator**: Authenticated user with Administrator role operating the portal.
- **Platform User**: Any account (patient, doctor, admin) manageable from User Management.
- **Doctor Application / Doctor Account**: Clinician profile subject to approval, rejection, and suspension.
- **Appointment (ops view)**: Cross-tenant appointment record for monitoring and support actions.
- **AI Operations Event**: Usage aggregate or flagged AI session/error for ops review.
- **Billing Transaction**: Payment, refund, or related money movement with status and references.
- **Revenue Summary**: Aggregated financial metrics for a period.
- **Platform Setting**: Named configuration value controlling platform behavior.
- **System Health Status**: Overall and per-component operational health snapshot.
- **Audit Log Entry**: Immutable record of who/what/when/subject for compliance.
- **Admin Notification**: Operational alert or message for administrators.
- **Role / Permission Grant**: Assignment of role or capability controlling admin powers.
- **Platform Announcement** *(optional)*: Broadcast message to a user segment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of Administrators reach the dashboard and identify Pending Doctor Approvals within 30 seconds of landing in a usability test.
- **SC-002**: Administrators complete doctor approve or reject (including reason when rejecting) in under 2 minutes for a typical application.
- **SC-003**: Administrators suspend a user with reason in under 1 minute from search start.
- **SC-004**: 100% of sensitive admin actions sampled in audit review produce a corresponding audit log entry.
- **SC-005**: Dashboard KPI widgets load to a usable state within 3 seconds on a standard office connection for typical data volumes.
- **SC-006**: Non-administrators attempting admin URLs are denied in 100% of automated access tests.
- **SC-007**: Arabic locale presents RTL navigation and readable labels on all primary admin screens in bilingual QA.
- **SC-008**: Primary admin flows remain keyboard-completable in accessibility spot-checks (dashboard, user suspend, doctor approve).
- **SC-009**: Visual QA against approved Stitch screens for shell + dashboard + at least three management pages reports no material layout deviations.
- **SC-010**: Enabling maintenance mode blocks non-admin product use while admins retain portal access in verification tests.
- **SC-011**: Refund of an eligible transaction completes with updated status and user-visible confirmation within one admin session.
- **SC-012**: Export of a filtered audit or analytics report succeeds for periods with data in ≥95% of test attempts.

## Assumptions

- Authentication, sessions, and the Administrator role already exist from prior auth/RBAC work; this feature builds the admin experience on that foundation.
- Approved Stitch MCP screens for the Administration Portal are available and are the visual/UX source of truth.
- “Active Appointments” means appointments in non-terminal states relevant to ops (e.g., confirmed / in progress), not historical completed volume.
- Revenue Summary and billing views use the platform’s existing payment records; payment-provider settlement files are out of scope unless already integrated.
- Refunds are limited to policies the business defines (full/partial as supported); chargeback handling with banks is out of scope beyond status notes.
- Admin appointment cancel is for support/ops exceptions; routine clinical scheduling remains with doctors/patients.
- Admins do not edit SOAP notes, sign prescriptions, or act as the treating clinician.
- Role & Permission Management in v1 focuses on assigning platform roles (especially Administrator) and a small set of sensitive admin capabilities; fine-grained custom role builder can be a later enhancement if not in Stitch.
- Platform announcements are included if present in Stitch; otherwise notifications are inbound-ops only.
- System Health checks cover core platform dependencies the product already relies on (application availability, data store reachability, critical integrations) at a summary level.
- Audit retention follows the platform’s healthcare-oriented retention policy (≥6 years for security/access events where applicable).
- Seed/demo Administrator accounts exist for development and QA.

## Dependencies

- Existing authentication and role enforcement (Administrator).
- Existing user, doctor, appointment, payment, AI, and notification domain data from prior modules.
- Approved Stitch Administration Portal designs.
- Localization catalogs for English and Arabic admin copy.
- Public website / patient / doctor surfaces that honor doctor approval, suspension, maintenance mode, and AI feature toggles.

## Out of Scope

- Redesigning UI away from approved Stitch screens.
- Building a separate mobile-native admin app.
- Full ERP/accounting system replacement (general ledger, payroll, tax filing).
- Direct clinical care delivery by administrators.
- Patient or doctor self-service portals (covered by other modules).
- Real-time NOC war-room tooling beyond the System Health summary described.
- Custom report builder / BI warehouse (standard canned reports only in v1).
- Legal e-discovery tooling beyond exportable audit/analytics artifacts.
