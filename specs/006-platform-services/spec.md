# Feature Specification: Platform Services & Shared Infrastructure

**Feature Branch**: `006-platform-services`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "Module 5: Platform Services & Shared Infrastructure — shared infrastructure used by every Hakeem feature: reusable services and shared business logic for notifications, email, SMS, push, payment gateway, billing, AI, file storage, medical document management, video consultation, search, audit logging, activity timeline, localization, feature flags, and configuration management. Not a single user portal; consumed by Public Website, Authentication, Patient Portal, Doctor Portal, and Administration Portal. UI for shared services already designed in Stitch MCP where applicable — do not redesign; use approved Stitch designs as source of truth. Business goals: eliminate duplicated business logic, centralize integrations, provide reusable capabilities, improve scalability, simplify maintenance, enable future integrations."

## Clarifications

### Session 2026-07-30

Informed defaults applied for a shared-services module (no interactive Q&A). Decisions below are reflected in Requirements, Assumptions, Edge Cases, User Stories, and Success Criteria.

- Q: Who “uses” Platform Services? → A: Consuming product modules (Public Website, Auth, Patient, Doctor, Admin) and operational staff via those portals. This module does not introduce a separate end-user portal. Where a shared capability has UI (e.g., notification center chrome, payment confirmation, file upload, video join, locale switcher), approved Stitch designs are the visual source of truth.
- Q: Relationship to existing modules? → A: Platform Services **centralizes and standardizes** cross-cutting capabilities already partially present in Auth, Patient, Doctor, and Admin (notifications, payments, AI, telemedicine, files, audit, settings). Product modules retain ownership of role-specific workflows; they MUST call shared platform capabilities instead of re-implementing integrations or core business rules.
- Q: Notification channels? → A: v1 supports **in-app**, **email**, and **SMS** as first-class channels. **Push** is designed and ready (device registration + send path) but may run in stub/disabled mode until mobile/web push providers are configured. Channel selection is per event type with user/locale preferences honored when available.
- Q: Payments & billing? → A: Shared payment gateway handles intent creation, confirmation/webhook outcomes, and refunds. Billing service owns platform payment obligations, status transitions (Pending → Paid | Failed | Cancelled → Partially refunded | Refunded | Disputed), and revenue aggregation inputs used by Admin. No multi-currency ledger or doctor payout settlement engine in v1 beyond recording and refunding platform charges (SAR primary).
- Q: AI service scope? → A: Shared AI capability serves patient assistant and doctor documentation/prescription assistants with common safety gates (global toggles, per-user disable, fail-closed when disabled, non-clinical disclaimer posture). AI never auto-approves doctors, never changes billing, and never signs clinical artifacts.
- Q: Files & medical documents? → A: File storage is the shared object store for uploads. Medical Document Management adds healthcare-specific classification, access control by role/relationship, malware/safety screening before availability, and audit of access/download. Clinical signed documents remain immutable once signed by the owning clinical workflow.
- Q: Video consultation? → A: Shared video service creates consultation rooms/sessions tied to appointments, issues time-bounded join credentials for authorized patient and doctor participants, and records join/leave operational events. Recording is off by default in v1 unless Stitch/ops explicitly enable it later.
- Q: Search? → A: Shared search indexes/query surfaces for platform entities needed across products (at least: doctors for public/patient discovery, and admin/ops lookups for users/doctors/appointments as already required by those portals). Relevance is pragmatic keyword + filter based; no personalized ML ranking in v1.
- Q: Audit vs activity timeline? → A: **Audit logging** is append-only security/compliance events (immutable for product UIs). **Activity timeline** is a user/clinician-facing chronological feed of care and account events (appointments, documents, messages, status changes) with role-appropriate visibility—not a substitute for the security audit trail.
- Q: Localization? → A: English and Arabic with full RTL for Arabic across shared UI surfaces; locale preference persists per user when authenticated and via site preference for anonymous public flows. Shared message catalogs and date/number formatting rules are centralized.
- Q: Feature flags & configuration? → A: Feature flags control gradual enablement of platform capabilities per environment/segment. Configuration management holds non-secret and secret-referenced platform settings (maintenance, support contacts, AI toggles, provider enablement) with audited changes for admin-managed settings; secrets themselves are never exposed in product UIs.

Non-interactive clarification pass (user directed no questions): enterprise-grade assumptions applied after validating notification channels, payment providers, AI providers, file storage, medical file security, video provider, localization, search, logging, monitoring, error handling, retry policies, webhooks, and background jobs. All decisions recorded below and reflected in Requirements, Assumptions, Edge Cases, User Stories, and Success Criteria.

- Q: Notification channels (enterprise)? → A: Canonical channels: **In-app** (always for account-bound events), **Email** (mandatory for Auth challenges and high-severity billing/security), **SMS** (optional per event; used for OTP-class and time-critical care reminders when phone verified), **Push** (optional; disabled until configured). Each event type has a declared channel matrix. Channel preference: user may opt down marketing-style notices later; **transactional/security notices cannot be fully opted out** of email+in-app. Delivery is **at-least-once** for queued outbound channels with idempotent send keys per (eventId, channel, recipient). PHI in notifications is minimized (no full clinical notes in email/SMS/push bodies).
- Q: Payment providers? → A: v1 uses **one primary payment provider** behind a swappable provider boundary. Cards/local methods as offered by that provider in SAR. Webhooks are the system of record for asynchronous success/failure; client-side “paid” UI is provisional until webhook/reconcile confirms. Manual settlement path remains for Admin when provider refund API is unavailable. Multi-provider routing and doctor payout settlement remain out of v1.
- Q: AI providers? → A: One **primary AI provider** (plus optional stub for non-production) behind a shared boundary. Production use with PHI requires a **Business Associate Agreement (BAA)** or equivalent contractual gate before go-live—ops gate, not a user toggle. Prompts/responses may be retained for abuse review under Admin AI governance with retention ≥90 days for flagged content; routine transcripts follow product retention. No training on customer PHI for third-party models unless contractually allowed and explicitly configured off by default.
- Q: File storage? → A: Shared private object storage; **no public buckets**. Uploads via authorized, short-lived write credentials or server-mediated upload. Max size default **25 MB** per file unless product rules tighten; allowed types: common document/image formats used by Patient/Doctor (PDF, JPEG, PNG, and other types already accepted by those portals). Objects encrypted **at rest**; access via **short-lived signed download URLs** (≤15 minutes) or authenticated stream—never permanent public links.
- Q: Medical file security? → A: Medical documents are PHI. Access requires role + care relationship (patient owner, assigned/treating doctor, or Admin under existing admin policy). Every list/view/download is **auditable**. Malware/safety screening is **fail-closed** (unavailable until clean). Signed clinical artifacts immutable. Soft-delete/hide for end users does not purge audit or legal-hold copies in v1. Download URLs must not be shareable beyond expiry; re-auth required for new URL.
- Q: Video provider? → A: One **primary telemedicine/video provider** behind a shared boundary. Sessions bound 1:1 to telemedicine appointments. Join tokens **≤2 hours** or appointment end + grace (max 30 minutes), whichever is sooner. **Recording off by default** in v1. Waiting-room / lobby optional if provider supports; authorization still enforced by Hakeem before token issue. Media never written into audit logs.
- Q: Localization (enterprise)? → A: Locales **`en`** and **`ar`** only in v1. Default for new Saudi-facing anonymous visitors: **`ar`** when Accept-Language prefers Arabic, else **`en`**. Time zone default for shared scheduling displays: **Asia/Riyadh**. Shared catalogs cover UI strings, notification templates, and email/SMS templates. Missing keys fall back to English. Numbers/currency use locale-aware formatting; currency code remains SAR.
- Q: Search (enterprise)? → A: Doctor discovery is the P1 shared index. Admin/ops entity lookup may use the same query patterns already required by Admin (users/doctors/appointments) without a separate public search product. Index updates after publish/approve/suspend MUST reflect in discovery within **5 minutes** under normal load. Bookable eligibility is enforced at query time as well as index flags (defense in depth). No user PII beyond doctor professional profile fields in public search results.
- Q: Logging? → A: Three distinct streams: (1) **Audit log** — compliance/security, append-only, UI-immutable; (2) **Activity timeline** — care/account UX feed; (3) **Operational logs** — service diagnostics (request id, service name, outcome, latency class). Operational logs MUST NOT contain passwords, session tokens, raw card data, full document contents, or unredacted webhook secrets. Correlation id propagated across shared service calls when available.
- Q: Monitoring? → A: Shared services expose **component health** signals consumed by Administration System Health: Email, SMS, Payments, AI, Storage, Video (and App/Database as already defined). Status Healthy | Degraded | Down based on recent check success and error-rate thresholds. No full APM product inside Hakeem v1; health is summary-level. Critical payment/webhook processing failures raise Admin notifications (existing Admin notification categories).
- Q: Error handling? → A: Shared services return a small outcome taxonomy to callers: **Success**, **ValidationError**, **Unauthorized**, **Forbidden**, **NotFound**, **Conflict** (including idempotent replay), **RateLimited**, **DependencyUnavailable**, **InternalFailure**. User-facing portals map these to safe, localized messages; internal detail stays in operational logs. Partial multi-channel notification success is reported as **PartialSuccess** with per-channel statuses.
- Q: Retry policies? → A: Transient dependency failures (provider 5xx, timeouts, network): **exponential backoff** with jitter, **max 5 attempts**, initial delay ~1s, cap ~15 minutes for background work. Non-retryable: validation, authz, hard provider declines, malware reject. After max attempts, item moves to **failed/dead-letter** state visible to ops via Admin health/notifications—not silent drop. Callers doing synchronous UX paths get fast failure after short timeout (≤10s user-facing) while background retry continues where queued.
- Q: Webhooks? → A: Inbound webhooks (payments, optionally video/provider events) MUST verify **shared-secret or signature**, reject unsigned/invalid with denial audit where appropriate, and process **idempotently** by provider event id. Out-of-order events: status machine only advances allowed transitions (never Paid → Pending). Replay of the same event id is a no-op success. Webhook handlers acknowledge quickly; heavy work is deferred to background jobs when needed.
- Q: Background jobs? → A: Asynchronous work is first-class for: outbound email/SMS/push send, malware screening, search index refresh, webhook reconciliation/side effects, and notification fan-out to multiple admins. Jobs are durable (survive process restart), uniquely keyed for idempotency, observable (queued/running/succeeded/failed), and respect the retry policy above. Product UX MUST NOT assume instant completion of background-only steps; surfaces show pending/processing states where Stitch provides them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Shared Notification Delivery (Priority: P1)

When a product module needs to inform a user (appointment booked, payment received, doctor approved, security alert), it requests a notification through the shared Notification Service. The service creates an in-app notification (when the user has an account), optionally mirrors to email and/or SMS per event policy, respects locale, and supports mark-read / deep-link patterns already used by portals.

**Why this priority**: Notifications are the primary cross-module communication path; duplication causes inconsistent messaging and missed alerts.

**Independent Test**: Trigger a sample event from a consuming module; confirm in-app notification appears for the recipient; confirm email and SMS send when channel policy requires them; confirm unread badge and mark-read; confirm Arabic/English content selection.

**Acceptance Scenarios**:

1. **Given** a product event that requires user notice, **When** the Notification Service is invoked with recipient, category, title/body (or template key), and optional deep link, **Then** an in-app notification is stored for that recipient and becomes visible in their portal notification surface.
2. **Given** an event policy that includes email, **When** the notification is created, **Then** an email is queued/sent to the recipient’s verified email with localized content and minimal necessary personal data.
3. **Given** an event policy that includes SMS and a phone number on file, **When** the notification is created, **Then** an SMS is attempted; if phone is missing, email/in-app still succeed and the SMS failure is recorded without failing the whole request.
4. **Given** unread notifications, **When** the user marks one or all as read, **Then** unread counts update consistently across shell badges that consume the shared service.
5. **Given** Arabic locale preference, **When** a templated notification is rendered, **Then** Arabic copy is used (and RTL-ready content for in-app UI).

---

### User Story 2 - Email & SMS Messaging Primitives (Priority: P1)

Auth and other modules send transactional email and SMS through shared Email and SMS services (verification, password reset, invites, reminders) instead of ad-hoc providers. Delivery attempts are rate-limited, logged for ops, and fail safely without leaking whether an account exists when Auth anti-enumeration rules apply.

**Why this priority**: Identity and care workflows depend on reliable, consistent outbound messaging.

**Independent Test**: Send verification and reset emails via the shared email capability; send a test SMS when configured; confirm rate limits; confirm provider downtime surfaces a retryable failure without crashing the calling flow.

**Acceptance Scenarios**:

1. **Given** a transactional email request (to, subject, body/template, locale), **When** Email Service processes it, **Then** the message is accepted for delivery or rejected with a clear error code the caller can handle.
2. **Given** repeated email sends for the same account/purpose beyond Auth limits, **When** another send is requested, **Then** the service enforces rate limits and returns a throttled outcome.
3. **Given** SMS is configured, **When** a valid SMS request is submitted, **Then** the message is accepted for delivery to the destination number.
4. **Given** SMS or email provider is unavailable, **When** a send is attempted, **Then** the caller receives a failure outcome suitable for retry/queue and no partial secret tokens are logged in clear text.

---

### User Story 3 - Push Notifications Readiness (Priority: P2)

Users (or their devices) can register for push delivery. Product events may request push alongside other channels. When push is not configured for the environment, requests no-op safely without breaking in-app/email/SMS.

**Why this priority**: Enables mobile/web engagement without blocking core v1 channels.

**Independent Test**: Register a device token; send a push for a test event; with push disabled, confirm other channels still work and push is skipped with a recorded skip reason.

**Acceptance Scenarios**:

1. **Given** an authenticated user, **When** their client registers a push device token, **Then** the platform stores the registration bound to that user.
2. **Given** a notification event that includes push and a registered device, **When** push is enabled in configuration, **Then** a push payload is sent (or queued) with localized title/body.
3. **Given** push is disabled or unconfigured, **When** a push send is requested, **Then** the overall notification flow still succeeds for enabled channels.

---

### User Story 4 - Payment Gateway & Billing Obligations (Priority: P1)

Patient (and other) payment flows create payment intents through the shared Payment Gateway, reconcile provider outcomes into Billing Service obligations, and support refunds initiated by Admin using the same shared refund path. Statuses and amounts remain consistent everywhere payments appear.

**Why this priority**: Money movement must be single-sourced to avoid double charges and inconsistent refunds.

**Independent Test**: Create a payment for a known obligation; simulate success and failure outcomes; process partial then full refund; confirm status transitions and that portals read the same shared records.

**Acceptance Scenarios**:

1. **Given** a payable obligation (e.g., appointment fee), **When** Payment Gateway creates a payment intent, **Then** the caller receives provider-facing details needed to complete payment and the obligation remains Pending until confirmation.
2. **Given** a successful provider confirmation, **When** Billing Service records the outcome, **Then** the obligation becomes Paid and related product workflows may proceed.
3. **Given** a failed or cancelled payment, **When** the outcome is recorded, **Then** the obligation reflects Failed or Cancelled and the user can retry per product rules.
4. **Given** a Paid or Partially refunded obligation with remaining refundable balance, **When** a refund is requested with amount and reason, **Then** the gateway initiates refund (or records manual settlement when provider refund is unavailable), balances update, and status becomes Partially refunded or Refunded.
5. **Given** a fully refunded obligation, **When** another refund is attempted, **Then** it is rejected.

---

### User Story 5 - Shared AI Assistance Capability (Priority: P1)

Patient and Doctor AI experiences call a shared AI Service that enforces platform AI governance (global feature flags, per-user disable, safety posture) and returns assistant responses with clear non-substitute-for-care messaging. Callers never bypass the shared gate.

**Why this priority**: AI is high-risk in healthcare; one governance path prevents unsafe divergent implementations.

**Independent Test**: With AI enabled, complete a patient and a doctor assistant turn; disable global or per-user AI and confirm fail-closed; confirm clinical sign/approve actions remain human-owned.

**Acceptance Scenarios**:

1. **Given** AI enabled for the relevant feature and user, **When** a chat/completion request is submitted, **Then** the shared AI Service returns an assistant response suitable for the calling product UI.
2. **Given** the global toggle for that AI feature is off, **When** a request is made, **Then** the service denies the request with a clear unavailable outcome.
3. **Given** AI is disabled for a specific user, **When** that user requests AI, **Then** the request is denied even if global toggles are on.
4. **Given** any AI response path, **When** content is produced, **Then** it does not claim to diagnose, prescribe, or replace professional care, and it cannot finalize clinical signatures or billing changes.

---

### User Story 6 - File Storage & Medical Document Management (Priority: P1)

Users upload files through shared File Storage. Medical Document Management classifies documents (lab, imaging, prescription PDF, identity, other), associates them with the owning patient/encounter context, screens for malware/unsafe content, and enforces who may list, view, or download. Access and downloads are auditable.

**Why this priority**: Healthcare files are sensitive and already required across Patient and Doctor workflows.

**Independent Test**: Upload a document as patient; confirm doctor with relationship can view; confirm unrelated user cannot; confirm malware rejection; confirm signed clinical artifacts cannot be silently overwritten.

**Acceptance Scenarios**:

1. **Given** an authorized uploader, **When** they upload a file with allowed type/size, **Then** storage accepts it and Medical Document Management creates a document record in a pending/available state after screening.
2. **Given** malware or disallowed content is detected, **When** screening completes, **Then** the document is not made available to end users and the uploader sees a clear rejection.
3. **Given** a document owned by a patient, **When** an authorized doctor (care relationship) or the patient requests access, **Then** they can view/download; unauthorized roles are denied.
4. **Given** a clinically signed document, **When** a modification is attempted through shared document APIs, **Then** content immutability is enforced (new version or rejection per clinical rules—no silent overwrite of signed content).

---

### User Story 7 - Video Consultation Sessions (Priority: P1)

For telemedicine appointments, the Video Consultation Service creates a session, issues join credentials only to the appointment’s patient and assigned doctor (while authorized), and records operational join/leave events. Unauthorized users cannot join.

**Why this priority**: Telemedicine is a core care delivery channel spanning Patient and Doctor portals.

**Independent Test**: Create a session for a confirmed telemedicine appointment; join as patient and doctor; attempt join as another user and confirm denial; confirm session ends after appointment window policy.

**Acceptance Scenarios**:

1. **Given** a confirmed telemedicine appointment, **When** either party requests to start/join, **Then** the service provides time-bounded join credentials for that participant only.
2. **Given** a user not party to the appointment, **When** they request join credentials, **Then** access is denied and the attempt is auditable.
3. **Given** an ended or cancelled appointment, **When** join is requested, **Then** credentials are refused.
4. **Given** successful joins, **When** participants connect, **Then** operational timeline/audit can show join activity without exposing media content in audit logs.

---

### User Story 8 - Shared Search (Priority: P2)

Public and authenticated experiences query a shared Search Service for doctors and other indexed entities with filters (specialty, availability signals, text query). Results respect publication/bookable rules and locale for display fields.

**Why this priority**: Discovery must stay consistent between public site and patient booking flows.

**Independent Test**: Search doctors by specialty and name; confirm suspended/non-bookable doctors are excluded from public bookable results; confirm empty query states.

**Acceptance Scenarios**:

1. **Given** published bookable doctors, **When** a visitor searches with text and filters, **Then** matching doctors appear with consistent identity fields used by Public and Patient experiences.
2. **Given** a non-bookable or suspended doctor, **When** public/patient discovery search runs, **Then** that doctor does not appear in bookable result sets.
3. **Given** no matches, **When** search completes, **Then** an empty result is returned without error.

---

### User Story 9 - Audit Logging & Activity Timeline (Priority: P1)

Security-sensitive and administrative actions write to the shared Audit Logging capability (append-only). Care and account milestones write to Activity Timeline for patient/doctor-facing chronological views. Consumers read the appropriate stream for their purpose.

**Why this priority**: Compliance and clinical context both require trustworthy history, but different audiences.

**Independent Test**: Perform a login failure, a refund, and an appointment completion; confirm audit entries for security/ops actions; confirm timeline entries visible to the correct roles only.

**Acceptance Scenarios**:

1. **Given** a security or admin-sensitive action, **When** it completes (success or denial), **Then** an append-only audit event records actor, action type, target, outcome, timestamp, and available request metadata.
2. **Given** any product UI, **When** a user attempts to edit or delete an audit event, **Then** the action is not available.
3. **Given** care events (appointment booked/completed, document added, prescription issued), **When** they occur, **Then** Activity Timeline shows them to authorized patient and/or doctor viewers in chronological order.
4. **Given** a user without relationship to a patient, **When** they request that patient’s timeline, **Then** access is denied.

---

### User Story 10 - Localization for Shared Surfaces (Priority: P1)

Shared UI and messages support English and Arabic. Locale selection updates shared chrome (and persists for signed-in users). Arabic layouts for shared components follow RTL. Date, time, and currency formatting follow locale rules for shared displays (SAR amounts).

**Why this priority**: Localization is a platform-wide promise already established across portals.

**Independent Test**: Switch locale on a shared surface; confirm strings, direction, and formatted amounts; confirm preference persists after reload for an authenticated user.

**Acceptance Scenarios**:

1. **Given** English UI, **When** the user switches to Arabic, **Then** shared labels render in Arabic with RTL layout.
2. **Given** an authenticated user who selected a locale, **When** they return later, **Then** their locale preference is applied by default.
3. **Given** shared monetary displays, **When** rendered, **Then** amounts use consistent SAR formatting appropriate to the active locale.

---

### User Story 11 - Feature Flags & Configuration Management (Priority: P2)

Administrators and operators control feature flags and platform configuration through shared Configuration Management (surfaced in Admin settings where designed). Flags gate capabilities (AI features, push, maintenance-related behaviors). Changes that affect production behavior are validated and audited; secrets are referenced, not displayed.

**Why this priority**: Central config reduces environment drift and unsafe hotfixes in product modules.

**Independent Test**: Toggle a feature flag and confirm consuming module behavior changes on new requests; update a support contact setting and confirm it appears where shared; attempt to read a secret value via UI and confirm it is masked/unavailable.

**Acceptance Scenarios**:

1. **Given** a feature flag controlling a capability, **When** an Administrator turns it off, **Then** new requests to that capability are denied or hidden per product rules.
2. **Given** a non-secret configuration value (e.g., support email), **When** it is updated, **Then** consuming surfaces read the new value and the change is audited with before/after.
3. **Given** secret configuration (API keys), **When** viewed in product UI, **Then** only presence/masked status is shown—not the secret material.
4. **Given** invalid configuration input, **When** save is attempted, **Then** validation errors prevent save.

---

### User Story 12 - Consuming Modules Use Shared Capabilities Only (Priority: P1)

Public Website, Auth, Patient, Doctor, and Admin integrate with Platform Services for the listed cross-cutting concerns rather than embedding duplicate provider logic. New product features prefer shared services first.

**Why this priority**: Delivers the business goals of de-duplication, centralized integrations, and maintainability.

**Independent Test**: Inventory each consuming module’s notification, payment, AI, file, video, search, audit, and messaging entry points and confirm they go through shared platform capabilities (no parallel private provider stacks for the same concern in v1).

**Acceptance Scenarios**:

1. **Given** a Patient Portal payment, **When** checkout runs, **Then** it uses the shared Payment Gateway/Billing Service.
2. **Given** Auth verification email, **When** sent, **Then** it uses the shared Email Service.
3. **Given** Doctor telemedicine join, **When** starting a visit, **Then** it uses the shared Video Consultation Service.
4. **Given** Admin refund, **When** processed, **Then** it uses the shared payment refund path and writes shared audit events.

---

### User Story 13 - Reliable Integrations: Webhooks, Retries & Background Work (Priority: P1)

External providers confirm payments (and optionally other events) via signed webhooks. Platform Services verifies authenticity, applies idempotent billing/state updates, and runs slow work (messaging, screening, indexing) as durable background jobs with retries and ops-visible failure.

**Why this priority**: Without reliable async processing, payments and notifications diverge across portals and silent failures erode trust.

**Independent Test**: Replay a signed payment webhook twice and confirm single Paid transition; send invalid signature and confirm rejection; fail a provider send and confirm retries then dead-letter/ops notice; confirm malware scan runs asynchronously before document availability.

**Acceptance Scenarios**:

1. **Given** a valid signed payment webhook for a pending obligation, **When** it is received, **Then** Billing Service transitions status appropriately and a duplicate delivery with the same provider event id does not double-apply.
2. **Given** an unsigned or invalid webhook, **When** it is received, **Then** it is rejected without changing billing state.
3. **Given** a transient email/SMS provider failure, **When** a queued outbound message is processed, **Then** the platform retries with backoff up to the configured maximum and records final failure for ops if exhausted.
4. **Given** a medical document upload, **When** screening is required, **Then** the document stays unavailable until a background screening job marks it clean (or rejected).
5. **Given** doctor publish/approve/suspend, **When** search index refresh runs, **Then** discovery results reflect eligibility within the agreed freshness window under normal load.

---

### Edge Cases

- Provider outage (email, SMS, payments, AI, video, storage): callers receive clear failure/degraded outcomes; user-facing copy is safe; retries/queues where appropriate; in-app notification still created when only a mirror channel fails.
- Partial multi-channel notification: in-app succeeds, email fails → overall operation reports **PartialSuccess**; ops can see channel-level status.
- Duplicate webhook/payment confirmation: Billing Service is idempotent for the same provider event id (no-op success on replay).
- Out-of-order webhook: later Pending after Paid is ignored; only forward-compatible transitions apply.
- Invalid webhook signature: rejected; no state change; operational log + optional security audit for repeated abuse.
- Oversized or disallowed file upload: rejected before durable availability.
- Screening provider down: medical document remains unavailable (fail-closed), not silently published.
- Expired video join credentials: refused; user may request a fresh credential if still authorized.
- Search while index lagging: results may be slightly stale within freshness SLA but must not show non-bookable doctors as bookable (query-time eligibility check).
- Feature flag mid-session: new requests honor latest flag; in-flight user journeys show clear messaging if capability disappears.
- Locale missing translation key: fall back to English (or base locale) without blank critical CTAs.
- Audit volume spikes: writes remain append-only; list/export UIs paginate and cap exports as established by Admin.
- Push token invalid/expired: registration cleaned up; does not fail other channels.
- Background job poison message: after max retries, marked failed/dead-letter; Admin health/notification alerted; no infinite retry loop.
- Synchronous path timeout: user sees DependencyUnavailable within ≤10s while eligible work continues in background where queued.
- Operational log redaction failure risk: secrets, raw cards, session tokens, and full document bodies are never written to operational logs (defense via logging policy).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Platform Services MUST provide shared capabilities consumed by Public Website, Authentication, Patient Portal, Doctor Portal, and Administration Portal without requiring a separate end-user “platform portal.”
- **FR-002**: Where shared capabilities have user-facing UI, implementation MUST match approved Stitch designs as the visual source of truth and MUST NOT redesign those surfaces.
- **FR-003**: Notification Service MUST support creating in-app notifications with category, title, body, optional deep link, unread state, and mark-one/mark-all-read behaviors for eligible recipients.
- **FR-004**: Notification Service MUST support channel policies that can include in-app, email, SMS, and push, applying only enabled/configured channels per environment and event type.
- **FR-005**: Email Service MUST send transactional messages (templates or structured content) with locale selection and rate limiting suitable for Auth and care workflows.
- **FR-006**: SMS Service MUST send transactional SMS when configured and MUST fail safely when phone numbers are missing or the provider is unavailable.
- **FR-007**: Push Notifications MUST allow device registration for authenticated users and MUST no-op safely when push is disabled or unconfigured.
- **FR-008**: Payment Gateway MUST support creating payment intents, recording provider outcomes, and processing refunds up to the remaining refundable balance.
- **FR-009**: Billing Service MUST own payment obligation lifecycle states (including Paid, Failed, Cancelled, Partially refunded, Refunded, Disputed) and expose consistent status/amounts to all consuming modules.
- **FR-010**: Payment and refund processing MUST be idempotent with respect to duplicate provider confirmations and MUST reject refunds that exceed remaining balance.
- **FR-011**: AI Service MUST serve assistant requests for patient and doctor product features under shared governance (global feature enablement and per-user disable) and MUST fail closed when disabled.
- **FR-012**: AI Service MUST NOT approve doctors, alter billing, or apply clinical signatures.
- **FR-013**: File Storage MUST accept authorized uploads within allowed types/sizes and provide controlled download access.
- **FR-014**: Medical Document Management MUST classify documents, associate them with owning context (patient/encounter as applicable), require safety/malware screening before availability, and enforce role/relationship-based access.
- **FR-015**: Signed clinical documents MUST remain immutable through shared document APIs (no silent overwrite of signed content).
- **FR-016**: Video Consultation Service MUST create sessions for telemedicine appointments and issue time-bounded join credentials only to authorized participants.
- **FR-017**: Video Consultation Service MUST deny join requests for unauthorized users and for ended/cancelled appointments, with auditable denials.
- **FR-018**: Search Service MUST provide doctor discovery search/filter results that respect publication and bookable eligibility rules consistently for Public and Patient experiences.
- **FR-019**: Audit Logging MUST record security and admin-sensitive events as append-only entries including actor, action, target, outcome, timestamp, and available request metadata.
- **FR-020**: Product UIs MUST NOT allow editing or deleting audit log entries.
- **FR-021**: Activity Timeline MUST present chronological care/account events to authorized patient and doctor viewers and MUST deny unrelated accessors.
- **FR-022**: Localization MUST support English and Arabic (with RTL for Arabic) for shared surfaces and shared message content, including persisted locale preference for authenticated users.
- **FR-023**: Feature Flags MUST enable or disable platform capabilities such that consuming modules honor the flag on new requests.
- **FR-024**: Configuration Management MUST store platform settings used across modules, validate updates, audit admin-visible setting changes, and never expose secret material in product UIs.
- **FR-025**: Consuming modules MUST use Platform Services for notifications, email/SMS (and push when used), payments/billing, AI, files/medical documents, video consultation, shared search, audit, activity timeline, localization catalogs, and feature flags/configuration rather than duplicating those integrations in v1.
- **FR-026**: Shared services MUST return clear success, validation, authorization, and dependency-failure outcomes so product modules can show safe user messaging.
- **FR-027**: Shared services that process personal or health data MUST enforce authorization based on the calling user’s role and relationship to the target resource.
- **FR-028**: High-impact shared mutations (refunds, document availability, video credential issuance, configuration changes) MUST be attributable in audit logs.
- **FR-029**: Notification channel matrix MUST treat in-app as required for account-bound product events; email as required for Auth challenges and high-severity billing/security notices; SMS and push as optional per event and configuration; transactional/security email+in-app MUST NOT be fully user-opted-out.
- **FR-030**: Outbound email/SMS/push MUST use at-least-once delivery with idempotent send keys per (event, channel, recipient) and MUST minimize PHI in message bodies.
- **FR-031**: Payment integration MUST use a single primary provider boundary in v1; asynchronous provider confirmations via verified webhooks are authoritative over provisional client success signals.
- **FR-032**: AI integration MUST use a single primary provider boundary in v1; production PHI processing MUST be blocked until contractual BAA/equivalent gate is satisfied; third-party training on customer PHI MUST be off by default.
- **FR-033**: File Storage MUST keep objects private (no public buckets), encrypt at rest, enforce size/type limits, and issue only short-lived download access (≤15 minutes) or authenticated streams.
- **FR-034**: Medical document list/view/download MUST be relationship-authorized and audited; screening MUST be fail-closed; soft-delete MUST NOT purge compliance audit history in v1.
- **FR-035**: Video integration MUST use a single primary provider boundary; join credentials MUST be time-bounded; recording MUST be off by default in v1; media content MUST NOT appear in audit logs.
- **FR-036**: Localization MUST cover locales `en` and `ar` only in v1, default anonymous locale by Accept-Language with Arabic preference → `ar`, default shared timezone Asia/Riyadh, and English fallback for missing keys.
- **FR-037**: Search discovery updates after publish/approve/suspend MUST become visible within 5 minutes under normal load, with query-time bookable eligibility enforcement.
- **FR-038**: Platform MUST maintain distinct Audit, Activity Timeline, and Operational logging streams; operational logs MUST NOT contain secrets, session tokens, raw payment card data, or full document bodies.
- **FR-039**: Shared service health for Email, SMS, Payments, AI, Storage, and Video MUST be reportable to Administration System Health as Healthy, Degraded, or Down.
- **FR-040**: Shared service outcomes MUST use a consistent taxonomy including Success, PartialSuccess, ValidationError, Unauthorized, Forbidden, NotFound, Conflict, RateLimited, DependencyUnavailable, and InternalFailure.
- **FR-041**: Transient dependency failures for background work MUST retry with exponential backoff and jitter, maximum 5 attempts, then enter failed/dead-letter with ops visibility; user-facing synchronous calls MUST fail fast (≤10 seconds) with DependencyUnavailable when waiting is not appropriate.
- **FR-042**: Inbound webhooks MUST verify signature or shared secret, process idempotently by provider event id, ignore illegal backward status transitions, and acknowledge promptly with heavy work deferred to background jobs when needed.
- **FR-043**: Background jobs MUST cover at least outbound messaging, malware screening, search index refresh, webhook side-effect processing, and admin notification fan-out; jobs MUST be durable, idempotent-keyed, and observable (queued/running/succeeded/failed).

### Key Entities

- **Notification**: Recipient-bound message with category, channels attempted, read state, optional deep link, and localized content reference.
- **Outbound Message**: Email or SMS (or push) delivery attempt with template/purpose, locale, provider status, idempotency key, and rate-limit context.
- **Push Device Registration**: User-bound device token and platform metadata for push delivery.
- **Payment Obligation**: Amount, currency, status, payer, linked business reference (e.g., appointment), refunded total, dispute note.
- **Payment Attempt / Intent**: Provider-facing payment attempt linked to an obligation and reconciliation identifiers.
- **Refund**: Amount, reason, actor, linked obligation, provider reference, outcome.
- **Webhook Event**: Provider event id, type, signature verification outcome, processing status, linked obligation/session when applicable.
- **Background Job**: Job type, idempotency key, payload reference, attempt count, state (queued/running/succeeded/failed), last error class.
- **AI Conversation Turn**: Feature scope (patient/doctor), user, messages, governance decision (allowed/denied), safety metadata.
- **Stored File**: Object reference, content type, size, uploader, screening status, encryption-at-rest indicator.
- **Medical Document**: Classification, owning patient/context, linked file(s), availability state, signature/immutability flags, access policy.
- **Video Session**: Linked appointment, participant roster, credential window, operational join events.
- **Search Index Entry**: Entity type (e.g., doctor), display fields, filters, bookable/publish flags, last indexed time.
- **Audit Event**: Append-only security/ops event with actor, action, target, outcome, timestamp, metadata.
- **Timeline Event**: User-visible activity item with visibility scope and chronological ordering.
- **Operational Log Record**: Diagnostic event with correlation id, service, outcome, and redacted detail (not a compliance audit row).
- **Locale Preference**: User or anonymous preference for language/direction.
- **Feature Flag**: Named capability switch with environment/segment scope.
- **Platform Setting**: Typed configuration value (including secret references) with audit history for admin-managed changes.
- **Health Component Signal**: Named dependency (Email, SMS, Payments, AI, Storage, Video, etc.) with status and last check summary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of v1 product modules that send user notices for the covered event types do so through the shared Notification Service (no parallel private notification stacks for those events).
- **SC-002**: 100% of Auth transactional emails (verification, password reset, invites) go through the shared Email Service.
- **SC-003**: Payment success, failure, and refund status shown in Patient and Admin views refer to the same Billing Service obligation for a given charge in 100% of sampled reconciliation checks.
- **SC-004**: When AI is globally or per-user disabled, 100% of sampled AI requests from Patient and Doctor experiences are denied (fail-closed) within the same user-visible session attempt.
- **SC-005**: Unauthorized document download attempts are denied in 100% of sampled cross-user access tests; authorized patient/doctor relationship access succeeds.
- **SC-006**: Unauthorized video join attempts are denied in 100% of sampled tests; authorized patient and assigned doctor can obtain join credentials for an active telemedicine appointment.
- **SC-007**: Public and Patient doctor discovery for the same query/filters return consistent bookable membership (no doctor bookable in one surface and hidden/contradictory in the other) in sampled side-by-side checks.
- **SC-008**: Security-sensitive actions (login denial of privileged routes, refunds, configuration changes, document access denials) produce audit events visible to Administrators in ≥99% of successful test executions.
- **SC-009**: Users can switch shared UI between English and Arabic and complete a primary shared task (e.g., view notification or open a document metadata screen) in under 2 minutes without layout breakage of critical controls.
- **SC-010**: After turning off a feature flag for a capability, new user attempts to use that capability fail or hide entry points within 1 minute in manual verification (no multi-hour “stuck enabled” behavior as a product outcome).
- **SC-011**: On email or SMS provider outage, product flows that also create in-app notifications still create the in-app record in ≥95% of simulated outage tests (channel isolation).
- **SC-012**: Duplicate payment confirmation for the same provider event does not double-mark revenue (idempotent) in 100% of replay tests.
- **SC-013**: Stitch-covered shared UI surfaces used by this module match approved designs in visual QA for the primary viewport states defined in the design pack (no redesign deltas accepted as “improvements”).
- **SC-014**: Invalid payment webhook signatures are rejected with no billing state change in 100% of negative tests.
- **SC-015**: After max retries on a deliberately failing outbound message job, 100% of cases reach failed/dead-letter with ops-visible signal (no silent drop) in test harnesses.
- **SC-016**: Doctor eligibility changes (approve/suspend) appear correctly in discovery search within 5 minutes in ≥95% of timed verification runs under normal load.
- **SC-017**: Sampled operational logs for payment and document flows contain no raw secrets, session tokens, or full document bodies in 100% of log-policy review checks.
- **SC-018**: System Health shows distinct signals for Payments, AI, Storage, and Video (when configured) such that a forced dependency failure flips the matching component from Healthy within one manual refresh cycle in ops verification.

## Assumptions

- Platform Services is infrastructure for Hakeem modules already specified (001–005); it standardizes shared behavior rather than replacing portal-specific UX ownership.
- Approved Stitch designs remain authoritative wherever shared UI exists; absence of a Stitch screen for a pure backend capability does not block that capability.
- Primary currency is SAR; multi-currency settlement is out of v1.
- Push may ship behind a configuration flag; in-app + email (+ SMS when configured) are the mandatory reliable channels for v1 critical events.
- Video recording, realtime transcription storage, and call analytics dashboards are out of v1 unless already required by an existing portal story.
- Full-text search is keyword/filter based; advanced semantic search is future work.
- Activity Timeline is not a legal audit substitute; Audit Logging remains the compliance system of record; Operational logs are diagnostics only.
- Provider credentials and webhook secrets live in secure configuration; product UIs never display raw secrets.
- Malware/safety screening may use a platform scanner port; if a scanner is unavailable in an environment, uploads that require screening stay unavailable until screening can complete (fail closed for medical docs).
- Existing Auth RBAC, Admin settings/AI toggles, and portal notification centers are consumers/extenders of these shared services, not competing systems.
- Future integrations (additional payment providers, SMS gateways, push vendors, AI vendors) plug into the same shared capabilities without requiring each portal to redesign its business flow.
- Operational backup/retention for audit and documents follows healthcare-appropriate retention already assumed in Auth (≥365 days security audit floor) and Admin (longer for admin governance where specified); this module does not introduce a user-facing “delete audit” capability.
- Single primary payment, AI, and video providers in v1; vendor brand names are configuration choices, not product UX.
- Production AI with PHI requires BAA/equivalent before go-live (operational gate).
- Default shared timezone Asia/Riyadh; locales limited to English and Arabic in v1.
- Max upload 25 MB unless a product flow specifies a tighter limit; download URLs expire within 15 minutes.
- Webhook signature verification is mandatory for payment (and any other inbound provider callbacks enabled in v1).
- Background jobs are the default for messaging fan-out, screening, indexing, and non-critical webhook side effects.
- Retry: exponential backoff + jitter, max 5 attempts; dead-letter with Admin-visible alert afterward.
- User-facing synchronous dependency waits capped at ~10 seconds before DependencyUnavailable.
- Health monitoring is summary component checks (not a full APM suite) aligned with Administration System Health.
- Out of scope for this module’s v1: multi-provider payment routing, doctor payout ledgers, semantic search, call recording vault, customer-facing log explorers, and a separate Platform Services portal UI.
