# Feature Specification: Patient Portal & Dashboard

**Feature Branch**: `003-patient-portal`

**Created**: 2026-07-29

**Status**: Draft

**Input**: User description: "Define the complete Patient Portal for Hakeem. Only authenticated Patients can access this module. Features: Dashboard, Profile Management, Medical Profile, Appointment Management, Upcoming Appointments, Appointment History, Find Doctors, Book Appointment, Video Consultation, AI Medical Assistant, Medical Records, Lab Results, Prescriptions, Payments, Notifications, Settings. Business goals: manage healthcare journey, improve appointment completion, secure telemedicine, AI-assisted support, complete medical history access, privacy and security. Dashboard shows welcome, upcoming appointments, recent doctors, active prescriptions, recent medical records, AI shortcut, notifications, payment status, and quick actions. Must support responsive design, accessibility, English, Arabic, and RTL. UI already designed and approved in Stitch — do not redesign; Stitch is the single source of truth."

## Clarifications

### Session 2026-07-29

Non-interactive clarification pass: user directed no questions; enterprise-grade assumptions applied for dashboard widgets, appointment workflow, video consultation, medical records/prescriptions/labs, payments, notifications, privacy, HIPAA-ready controls, AI permissions, file upload, document viewer, search/filter/pagination, and empty/error/offline states. All decisions recorded below and reflected in Requirements, Assumptions, Edge Cases, and Success Criteria.

- Q: Dashboard widget content limits? → A: Upcoming appointments: next 3; recent doctors: up to 5 distinct doctors from recent appointments; active prescriptions: up to 3; recent medical records: up to 3; notifications summary: unread count + up to 5 newest unread; payment status: single aggregate outstanding amount/status (or “all clear”); each widget loads independently so one failure does not blank the whole dashboard.
- Q: Appointment lifecycle & booking holds? → A: States: Held (temporary) → Confirmed → Cancelled | Rescheduled | In progress | Completed | No-show. Booking places a soft hold ≤10 minutes; confirm converts hold to Confirmed. v1 auto-confirms on successful patient booking (no admin approval gate). Cancel/reschedule allowed until 12 hours before start; within 12 hours only view/join (if video) unless operations cancel. Reschedule = cancel original + new Confirmed slot atomically from patient perspective.
- Q: Video consultation join window & safeguards? → A: Join enabled from 15 minutes before scheduled start until 60 minutes after start or until the visit is marked Completed/Cancelled, whichever first. Waiting-room UX before clinician admits when design supports it. Media is end-to-end or transport-encrypted via the telemedicine provider; patient cannot download a recording in v1; join/leave and failures are audited; only the appointment’s patient may join.
- Q: Medical record / prescription / lab visibility rules? → A: Records: patient may list/view only items linked to their identity; clinician-authored content is read-only. Prescriptions: Active = status active and not past end/expiry; historical listed separately; no patient-side prescribe/edit; refill request out of v1 scope. Labs: visible only when status is Released to patient; Preliminary vs Final labeled; Retracted/Superseded hidden or replaced by notice; critical-flagged released results show a non-alarmist attention banner with “contact your clinician / emergency if severe” guidance—not automated diagnosis.
- Q: Payment history & integrity? → A: List shows Paid, Pending, Failed, Refunded with date, amount, currency, related service/appointment reference; default window last 24 months with pagination; receipt/statement download when available; idempotent pay intent (same obligation cannot be charged twice as Paid); card PAN/CVV never stored in Hakeem.
- Q: Notification center behavior? → A: In-portal is primary; optional email mirrors categories enabled in Settings. Categories: appointments, clinical/results, prescriptions, payments, system. Retain notifications ≥90 days; unread badge; mark one/all read; dismiss hides from default list but remains in audit retention if required; deep links re-check authorization.
- Q: Patient privacy & HIPAA-ready posture? → A: Minimum-necessary display; no PHI in URLs/query strings; anti-enumeration on IDs; TLS in transit; PHI encrypted at rest; access authorization on every read; immutable audit of PHI views/downloads/joins/payment events retained ≥6 years (HIPAA-aligned); no PHI in third-party marketing analytics; session end clears interactive PHI from client storage under app control; vendors handling PHI require BAA before production (planning/ops gate). Module is HIPAA-ready architecture, not a claim of certification.
- Q: AI assistant permissions & data use? → A: Authenticated Patient only. May use patient-provided medical profile and high-level scheduling context the patient can already see; MUST NOT access other patients’ data; MUST NOT write clinical records, prescriptions, or lab results; MUST NOT claim diagnosis or emergency triage authority; rate-limited; conversations retained ≤12 months unless legal hold; always show disclaimer; escalate UX toward book/find doctor or emergency advice.
- Q: File upload & medical document viewer? → A: Uploads allowed only for patient-controlled attachments (e.g., medical profile supporting files / insurance card) per Stitch—not for forging clinician records. Types: PDF, JPEG, PNG; max 10 MB/file; max 20 active uploads/patient; malware scan before availability; reject executable/macros. Viewer: in-portal PDF/image preview for patient-authorized documents; download/print allowed when design permits and each download is audited; no public unauthenticated document links.
- Q: Search, filter, pagination? → A: Find Doctors: search by name + filter specialty (and availability if in design). Appointments/records/labs/prescriptions/payments/notifications: filter by status and/or date range where lists exist; text search on title/label fields when design includes search. Default page size 20; dashboard widgets use fixed caps (not full pagination). Stable sort: newest/soonest first per list type.
- Q: Empty, error, offline states? → A: Every list/widget has an empty state + primary CTA. Errors: user-safe messages, retry where safe, no stack traces/PHI leakage; widget-level error isolation on dashboard. Offline/connectivity loss: no offline-first cache for PHI mutations; show reconnect/retry; block submits that cannot be confirmed; after reconnect, refresh authoritative server state.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access patient portal and dashboard (Priority: P1)

An authenticated patient lands on a personalized dashboard that summarizes their healthcare status and provides quick actions to the most common next steps.

**Why this priority**: The dashboard is the post-login home and the hub for every other portal journey. Without it, patients have no coherent workspace.

**Independent Test**: Sign in as a verified patient; confirm the approved dashboard layout loads with personalization; confirm each dashboard section and quick action navigates correctly or shows an empty state; confirm non-patients and guests cannot open the portal; confirm one widget failure does not blank others.

**Acceptance Scenarios**:

1. **Given** a verified patient with an active session, **When** they open the patient portal home, **Then** they see the approved Stitch dashboard including welcome message, upcoming appointments (up to 3), recent doctors (up to 5), active prescriptions (up to 3), recent medical records (up to 3), AI assistant shortcut, notifications summary (unread count + up to 5), payment status aggregate, and quick actions.
2. **Given** a patient with no data in a section (e.g., no upcoming appointments), **When** the dashboard loads, **Then** that section shows a clear empty state and a relevant call-to-action (e.g., Book Appointment) without errors.
3. **Given** the dashboard quick actions (Book Appointment, Find Doctor, Start AI Chat, View Medical Record, View Prescriptions, Edit Profile), **When** the patient activates any action, **Then** they are taken to the corresponding approved portal screen.
4. **Given** an unauthenticated visitor or a signed-in Doctor/Administrator, **When** they request any patient portal URL, **Then** access is denied and they are redirected to the appropriate unauthorized or role-denied experience without exposing patient data.
5. **Given** a patient using English or Arabic (including RTL), **When** they view the dashboard on desktop or mobile viewport sizes defined by the approved design, **Then** layout, text direction, and interactive controls match the Stitch source of truth and remain usable.
6. **Given** a transient failure loading one widget’s data, **When** the dashboard renders, **Then** other widgets still load and the failed widget shows a safe error with retry.

---

### User Story 2 - Manage personal profile and settings (Priority: P1)

A patient views and updates their account profile and portal preferences so their identity and contact details stay accurate.

**Why this priority**: Accurate identity and contact data underpin appointments, notifications, and privacy. Profile/settings are foundational before clinical workflows.

**Independent Test**: Open Profile and Settings; update allowed fields; confirm validation, save confirmation, and that restricted identity fields follow policy; confirm language preference switches English/Arabic where offered; confirm allowed file uploads for profile attachments meet type/size rules.

**Acceptance Scenarios**:

1. **Given** an authenticated patient, **When** they open Profile Management, **Then** they see their current profile details as shown in the approved Stitch design.
2. **Given** valid editable profile fields, **When** the patient saves changes, **Then** updates persist and a success confirmation is shown.
3. **Given** invalid or incomplete required fields, **When** the patient attempts to save, **Then** the system blocks save and shows clear field-level guidance.
4. **Given** Settings, **When** the patient updates notification preferences or language preference (English/Arabic), **Then** preferences are saved and subsequent portal screens respect the chosen language and direction.
5. **Given** Settings includes account security entry points already provided by authentication (e.g., change password, manage sessions), **When** the patient uses them, **Then** they reach those flows without leaving the authenticated patient context improperly.
6. **Given** an allowed profile/medical-profile attachment upload, **When** the file is PDF/JPEG/PNG ≤10 MB and under the patient’s upload cap, **Then** it is scanned and stored; disallowed types or oversized files are rejected with a clear message.

---

### User Story 3 - Maintain medical profile (Priority: P2)

A patient maintains health background information (such as conditions, allergies, medications, and demographics relevant to care) so clinicians and AI support can use accurate context.

**Why this priority**: Medical profile quality improves appointment readiness and AI/clinical relevance; it is needed early but after basic account profile.

**Independent Test**: Open Medical Profile; add/edit/remove allowed health background items; confirm privacy of data (only the patient and authorized care roles can access); confirm empty and validation states.

**Acceptance Scenarios**:

1. **Given** an authenticated patient, **When** they open Medical Profile, **Then** they see their current medical profile sections per the approved design.
2. **Given** the patient enters or updates medical profile information, **When** they save, **Then** the information is stored and reflected on subsequent views.
3. **Given** sensitive medical profile data, **When** another patient or unauthorized role attempts access, **Then** access is denied.
4. **Given** incomplete optional sections, **When** the patient views the profile, **Then** they can still use the portal and are gently prompted to complete missing high-value fields without being blocked from core navigation.

---

### User Story 4 - Find doctors and book appointments (Priority: P1)

A patient discovers doctors, selects a suitable provider, and books an appointment (in-person or telemedicine as offered) so care can be scheduled.

**Why this priority**: Booking is a primary business goal (journey management and appointment completion) and a core reason patients use the portal.

**Independent Test**: From Find Doctors or Book Appointment, search/filter doctors, pick a slot, confirm booking (hold→confirmed), and see the appointment in Upcoming Appointments; attempt invalid/unavailable slots and confirm failure handling; abandon mid-hold and confirm release.

**Acceptance Scenarios**:

1. **Given** an authenticated patient, **When** they open Find Doctors, **Then** they can search by name and filter by specialty (and availability when shown) and browse paginated results (page size 20) consistent with the approved design.
2. **Given** a selected doctor with available times, **When** the patient selects a slot, **Then** a temporary hold ≤10 minutes is created and shown as reserved for them.
3. **Given** a valid hold, **When** the patient confirms booking, **Then** the appointment becomes Confirmed, the patient receives clear confirmation, and the hold cannot be reused.
4. **Given** an unavailable, expired hold, or conflicting time, **When** booking is attempted, **Then** the system rejects the booking and prompts the patient to choose another time.
5. **Given** a successful booking, **When** the patient returns to the dashboard or Upcoming Appointments, **Then** the new appointment appears with correct date, time, doctor, and visit type.
6. **Given** a patient mid-booking who leaves or whose hold expires, **When** they return, **Then** no Confirmed appointment exists from that abandoned attempt and the slot is bookable again.

---

### User Story 5 - Manage upcoming appointments and history (Priority: P1)

A patient reviews upcoming visits, takes allowed actions (e.g., cancel/reschedule when permitted), and reviews past appointments to track their care timeline.

**Why this priority**: Completing and managing appointments directly supports the appointment-completion business goal.

**Independent Test**: With seeded upcoming and past appointments, verify lists, filters, pagination, detail views, cancel/reschedule rules, and that history is read-only for completed visits.

**Acceptance Scenarios**:

1. **Given** a patient with future appointments, **When** they open Upcoming Appointments, **Then** appointments are listed soonest-first with key details matching the approved design and support pagination when more than one page exists.
2. **Given** an upcoming appointment more than 12 hours before start, **When** the patient cancels or reschedules per design, **Then** status updates (Cancelled, or new Confirmed replacing prior) and related dashboard widgets refresh.
3. **Given** an appointment within 12 hours of start (or marked non-modifiable), **When** the patient attempts cancel/reschedule, **Then** the action is blocked with a clear explanation (join may still be available for video).
4. **Given** past appointments, **When** the patient opens Appointment History, **Then** they can filter by status/date and browse Completed/Cancelled/No-show visits without altering clinical outcomes.
5. **Given** no upcoming or historical appointments, **When** those screens load, **Then** empty states guide the patient to Find Doctors or Book Appointment.

---

### User Story 6 - Join video consultation (Priority: P2)

A patient joins a scheduled telemedicine visit securely from the portal when the appointment type is video.

**Why this priority**: Secure telemedicine is an explicit business goal; it depends on having bookable video appointments first.

**Independent Test**: For a video appointment in the join window, start Video Consultation from upcoming details/dashboard; confirm waiting room/pre-join checks; confirm joining outside the window is blocked; confirm non-video appointments do not offer join; confirm audit of join.

**Acceptance Scenarios**:

1. **Given** an upcoming video appointment within the join window (from 15 minutes before start through 60 minutes after start unless already Completed/Cancelled), **When** the patient selects Video Consultation / Join, **Then** they enter the approved consultation experience (including waiting room when designed) and can connect to their own visit only.
2. **Given** a video appointment outside the join window, **When** the patient attempts to join, **Then** they see when joining becomes available (or that it has ended) and cannot enter the live session.
3. **Given** an in-person (non-video) appointment, **When** the patient views its details, **Then** no live video join action is offered.
4. **Given** connectivity or device permission problems, **When** join fails, **Then** the patient sees actionable troubleshooting guidance without exposing other patients’ sessions.
5. **Given** the consultation ends or the patient leaves, **When** they return to the portal, **Then** appointment status reflects the visit outcome appropriately (e.g., Completed/No-show) per business rules and the patient cannot download a recording in v1.

---

### User Story 7 - View medical records, lab results, and prescriptions (Priority: P2)

A patient securely views their medical records, laboratory results, and prescriptions—including in-portal document viewing—so they have continuous access to their health history and active therapies.

**Why this priority**: Complete medical history access is a core business goal; clinical documents are high-value after scheduling basics exist.

**Independent Test**: Seed records/labs/prescriptions and attachments for a patient; verify list/detail/viewer, search/filter/pagination, empty states, release rules for labs, and that another patient cannot access those items; confirm downloads are audited.

**Acceptance Scenarios**:

1. **Given** an authenticated patient with medical records, **When** they open Medical Records, **Then** they can search/filter/paginate and open their own records in the approved UI, including in-portal preview for attached PDF/images when present.
2. **Given** lab results with Released-to-patient status, **When** they open Lab Results, **Then** they see summaries/details with Preliminary/Final labels; retracted items are not shown as current results.
3. **Given** active and past prescriptions, **When** they open Prescriptions (or Active Prescriptions from the dashboard), **Then** Active means not expired and status active; historical items are separate; content is read-only.
4. **Given** any clinical item belonging to another patient, **When** access is attempted by ID/guessing, **Then** the system denies access with a generic not-found/denied response (anti-enumeration).
5. **Given** no records/labs/prescriptions, **When** those areas open, **Then** empty states explain that items appear when available from care providers.
6. **Given** a downloadable patient-authorized document, **When** the patient downloads or prints it, **Then** the action succeeds when permitted and an audit event is recorded.

---

### User Story 8 - Track payments and payment status (Priority: P3)

A patient sees payment status for care services, reviews payment history, and completes outstanding payments when required so financial blockers do not prevent care continuity.

**Why this priority**: Payment visibility supports appointment completion and trust; it follows after core clinical scheduling and records.

**Independent Test**: With outstanding and paid items, verify Payment Status on dashboard, Payments screen list/filter/pagination, idempotent pay, and receipt availability.

**Acceptance Scenarios**:

1. **Given** a patient with an outstanding balance, **When** they view the dashboard Payment Status or Payments area, **Then** they see aggregate outstanding status/amount and a path to pay eligible items.
2. **Given** a payable item, **When** the patient completes payment successfully, **Then** status becomes Paid, related holds release if applicable, and a repeated submit does not create a second Paid charge for the same obligation.
3. **Given** a failed or cancelled payment attempt, **When** the flow ends, **Then** status is Failed or remains Pending as appropriate and the patient can retry safely.
4. **Given** payment history spanning many items, **When** the patient browses Payments, **Then** they see the last 24 months by default with pagination and can filter by status/date; receipts download when available.
5. **Given** no payment activity, **When** Payments opens, **Then** an empty state is shown without errors.

---

### User Story 9 - Receive and manage notifications (Priority: P2)

A patient receives portal notifications about appointments, results, prescriptions, payments, and system messages, and can review or dismiss them in a notification center.

**Why this priority**: Notifications improve appointment completion and engagement across other features.

**Independent Test**: Generate notifications of key types; verify list, unread badge, mark-read/dismiss, preference respect, pagination, and authorization on deep links.

**Acceptance Scenarios**:

1. **Given** new notifications for the patient, **When** they open the portal, **Then** the dashboard notifications summary and Notification Center reflect unread items (badge + newest items).
2. **Given** a notification with a deep link, **When** the patient opens it, **Then** authorization is re-checked and they navigate only if still permitted.
3. **Given** unread notifications, **When** the patient marks one or all read or dismisses items, **Then** counts and lists update accordingly.
4. **Given** notification preferences in Settings, **When** the patient disables a category, **Then** future in-portal (and email, when enabled) notifications of that category are suppressed.
5. **Given** another patient’s notifications, **When** access is attempted, **Then** they are not visible or accessible.
6. **Given** notifications older than the retention window for display, **When** the patient browses the center, **Then** only retained displayable items appear (operational audit retention may be longer).

---

### User Story 10 - Use AI Medical Assistant from the portal (Priority: P2)

A patient starts AI-assisted healthcare support from the dashboard shortcut or AI Medical Assistant area to ask questions and receive guidance that is clearly non-diagnostic where required by policy.

**Why this priority**: AI-assisted support is an explicit business goal and a differentiator, but it depends on authenticated patient context and safe disclaimers.

**Independent Test**: From dashboard Start AI Chat / AI Assistant Shortcut, open the assistant, send a message, receive a response, confirm disclaimer, confirm rate limiting and that clinical records cannot be mutated by the assistant.

**Acceptance Scenarios**:

1. **Given** an authenticated patient, **When** they use the AI Assistant Shortcut or open AI Medical Assistant, **Then** the approved assistant experience loads in their language with a visible disclaimer.
2. **Given** the patient sends a permitted question, **When** the assistant responds, **Then** the response is shown in the conversation UI scoped only to that patient; history is retained per retention policy (≤12 months).
3. **Given** the assistant, **When** it operates, **Then** it does not create/alter medical records, labs, or prescriptions and does not present itself as a diagnosing clinician or emergency service.
4. **Given** a situation where booking or urgent care is more appropriate, **When** the assistant suggests next steps, **Then** the patient can navigate to Find Doctors / Book Appointment or emergency guidance as designed.
5. **Given** excessive message volume, **When** the patient continues sending, **Then** rate limiting applies with a clear wait message.
6. **Given** an unauthenticated user, **When** they attempt the patient-portal AI workspace, **Then** access is denied.

---

### Edge Cases

- Session expires while the patient is mid-booking or mid-payment → patient is returned to sign-in; holds expire; incomplete payments stay Pending/Failed—not Paid.
- Doctor becomes unavailable after booking → patient is notified and offered reschedule/cancel paths.
- Lab result released then retracted → patient no longer sees it as current (or sees superseded notice only).
- Concurrent edits to profile from two devices → last successful save wins with confirmation; no silent full-profile wipe.
- RTL layout with long Arabic medical terms → text truncates or wraps per design without breaking primary actions.
- Accessibility: keyboard-only users can reach all primary actions; critical alerts are announced appropriately.
- Video join when camera/microphone permission is denied → guided fallback, not a blank screen.
- Payment provider timeout → no double charge; status remains Pending until confirmed.
- Patient tries to open portal routes by guessing IDs → generic deny/not-found; no existence leak.
- Very large history lists → pagination (page size 20) keeps UI usable.
- One dashboard widget API fails → other widgets still render; failed widget shows retry.
- Device goes offline during form submit → block optimistic success; show offline/error; refresh from server on reconnect.
- Malware or disallowed upload → reject before the file becomes available to view.
- AI prompted to reveal another patient’s data → refuse; no cross-patient context.
- Document viewer for unsupported type → safe message + download fallback only if authorized.
- Notification deep link to deleted appointment → safe not-found, notification markable read.

## Requirements *(mandatory)*

### Functional Requirements

#### Access & shell

- **FR-001**: Only authenticated users with the Patient role MUST be able to access Patient Portal screens and patient-owned data.
- **FR-002**: Every portal request MUST re-validate identity and Patient authorization server-side before returning protected data.
- **FR-003**: Doctors and Administrators MUST NOT access patient-portal routes or another person’s patient clinical data through this module.
- **FR-004**: Unauthenticated access attempts MUST be denied and directed to the existing authentication experience.
- **FR-005**: Portal UI MUST follow the approved Stitch designs as the single source of truth; teams MUST NOT redesign screens, components, or visual hierarchy covered by those designs.
- **FR-006**: Portal MUST support English and Arabic, including RTL layout for Arabic.
- **FR-007**: Portal MUST be responsive across the breakpoints represented in the approved Stitch desktop/tablet/mobile designs.
- **FR-008**: Portal MUST meet accessibility expectations consistent with the approved designs and WCAG 2.2 Level AA for interactive patient flows (keyboard access, labels, contrast, focus visibility).

#### Dashboard widgets

- **FR-009**: Dashboard MUST show a personalized welcome message using the patient’s display name (or safe fallback).
- **FR-010**: Dashboard MUST surface Upcoming Appointments (≤3), Recent Doctors (≤5), Active Prescriptions (≤3), Recent Medical Records (≤3), AI Assistant Shortcut, Notifications summary (unread count + ≤5 newest unread), Payment Status aggregate, and Quick Actions as specified by Stitch.
- **FR-011**: Quick Actions MUST include Book Appointment, Find Doctor, Start AI Chat, View Medical Record, View Prescriptions, and Edit Profile, each linking to the corresponding portal destination.
- **FR-012**: Dashboard sections MUST degrade gracefully with empty states when the patient has no items in that category.
- **FR-043**: Dashboard widgets MUST load independently; failure of one widget MUST NOT prevent rendering of others and MUST show a safe retryable error for the failed widget.

#### Profile & settings

- **FR-013**: Patients MUST be able to view and update allowed profile fields (e.g., name, contact details, demographics shown in design).
- **FR-014**: Patients MUST be able to manage Settings including language preference and notification category preferences reflected in the design.
- **FR-015**: Profile and settings changes MUST validate input and confirm success or failure clearly.

#### Medical profile

- **FR-016**: Patients MUST be able to view and maintain their Medical Profile (health background information as defined in Stitch and clinical content rules).
- **FR-017**: Medical Profile data MUST be private to the patient and authorized clinical/admin use cases outside this module’s patient UI.

#### Appointments

- **FR-018**: Patients MUST be able to find doctors (search by name, filter by specialty, browse/paginate) within the portal Find Doctors experience.
- **FR-019**: Patients MUST be able to book appointments via hold (≤10 minutes) then confirm; successful v1 bookings become Confirmed without an admin approval gate.
- **FR-020**: Patients MUST be able to view Upcoming Appointments and Appointment History with filter/pagination as applicable.
- **FR-021**: Patients MUST be able to cancel or reschedule upcoming appointments until 12 hours before start, and MUST be blocked with explanation when inside the restricted window or when marked non-modifiable.
- **FR-022**: Booking MUST prevent double-booking the same patient into conflicting times for the same service ruleset and MUST reject unavailable doctor slots; abandoned/expired holds MUST release slots.
- **FR-044**: Appointment states MUST include Held, Confirmed, Cancelled, Rescheduled (as replacement booking), In progress, Completed, and No-show for patient-visible lifecycle.

#### Video consultation

- **FR-023**: For video visit types, patients MUST be able to start Video Consultation from the portal within the join window (15 minutes before start through 60 minutes after start, unless Completed/Cancelled earlier).
- **FR-024**: Video join MUST be unavailable outside the join window and MUST NOT appear for non-video appointments.
- **FR-025**: Video sessions MUST be scoped so a patient can only join their own appointment’s consultation.
- **FR-045**: Video join/leave and hard failures MUST be audited; patients MUST NOT download visit recordings in v1; media MUST use provider encryption in transit.

#### Clinical information & document viewer

- **FR-026**: Patients MUST be able to view their Medical Records list and details with search/filter/pagination where the design provides list controls.
- **FR-027**: Patients MUST be able to view Lab Results only when Released to patient; Preliminary/Final MUST be labeled; Retracted/Superseded MUST not appear as current results.
- **FR-028**: Patients MUST be able to view Prescriptions; Active prescriptions are those with active status and not past end/expiry; historical are separate; content is read-only (no patient prescribe/edit; no refill-request workflow in v1).
- **FR-029**: Patients MUST only access their own clinical information; cross-patient access MUST be denied with anti-enumeration responses.
- **FR-046**: Patients MUST be able to preview authorized PDF/JPEG/PNG clinical or profile documents in an in-portal viewer; public unauthenticated document URLs MUST NOT be used.
- **FR-047**: Download/print of authorized documents MUST be allowed only when the design permits and MUST create an audit event.

#### File upload

- **FR-048**: File uploads MUST be limited to patient-controlled attachments allowed by Stitch (e.g., medical profile support files / insurance card), not clinician record forgery.
- **FR-049**: Uploads MUST accept only PDF, JPEG, PNG; maximum 10 MB per file; maximum 20 active uploads per patient; MUST be malware-scanned before availability; executable/macro-bearing files MUST be rejected.

#### Payments

- **FR-030**: Patients MUST see Payment Status for outstanding obligations on the dashboard (aggregate) and itemized in Payments.
- **FR-031**: Patients MUST be able to pay eligible outstanding items and review payment history (default last 24 months) with status Paid|Pending|Failed|Refunded.
- **FR-032**: Payment flows MUST be idempotent for a given obligation (no duplicate Paid charges), MUST surface Pending/Failed clearly, and MUST NOT store card PAN/CVV in Hakeem.
- **FR-050**: Patients MUST be able to download receipts/statements when available for Paid transactions.

#### Notifications

- **FR-033**: Patients MUST receive in-portal notifications for appointments, clinical/results, prescriptions, payments, and system events relevant to them.
- **FR-034**: Patients MUST be able to use a Notification Center to list, paginate, open authorized deep links, mark one/all read, and dismiss items per design; dashboard shows unread count and up to 5 newest unread.
- **FR-035**: Notification delivery MUST respect patient notification preferences (in-portal and email when email is configured).
- **FR-051**: Notification Center display retention MUST be at least 90 days; deep links MUST re-authorize at open time.

#### AI Medical Assistant

- **FR-036**: Patients MUST be able to open AI Medical Assistant from the dashboard shortcut and dedicated portal entry.
- **FR-037**: AI Assistant MUST present a clear non-emergency / not-a-doctor disclaimer consistent with healthcare policy and the approved UI.
- **FR-038**: AI conversations in this module MUST be private to the authenticated patient and MUST NOT use other patients’ data as context.
- **FR-039**: AI Assistant SHOULD offer navigation toward human care actions (find doctor / book appointment) when appropriate.
- **FR-052**: AI Assistant MUST NOT create or modify medical records, lab results, or prescriptions; MUST be rate-limited; MAY use the patient’s own visible medical profile and scheduling context; conversation retention MUST NOT exceed 12 months absent legal hold.

#### Search, filtering, pagination

- **FR-053**: Find Doctors MUST support name search and specialty filter (plus availability filter when present in design) with paginated results.
- **FR-054**: List screens for appointments, records, labs, prescriptions, payments, and notifications MUST support filtering by status and/or date range where those dimensions exist, and text search on titles/labels when search UI is present in Stitch.
- **FR-055**: Default list page size MUST be 20 items unless Stitch specifies otherwise; sort MUST be soonest/newest-first appropriate to the list.

#### Empty, error, and offline states

- **FR-056**: Every primary list and dashboard widget MUST provide an empty state with guidance and a primary CTA when applicable.
- **FR-057**: Error states MUST use user-safe messages with retry when safe, MUST NOT expose stack traces or other patients’ PHI, and MUST isolate dashboard widget failures.
- **FR-058**: The portal MUST NOT provide offline-first PHI mutation; when offline/connectivity is lost, submits that cannot be confirmed MUST be blocked or clearly failed, and reconnect MUST refresh authoritative server state.

#### Privacy, HIPAA-ready controls & audit

- **FR-040**: Protected health information shown in the portal MUST be transmitted only over authenticated, authorized sessions using encryption in transit (TLS).
- **FR-059**: PHI stores MUST be encrypted at rest; PHI MUST NOT appear in URLs/query strings; marketing analytics MUST NOT receive PHI.
- **FR-041**: Security-relevant portal events (PHI view/download, access denials, consultation joins/leaves, payment outcomes, upload accept/reject) MUST be auditable; PHI access audit retention MUST be ≥6 years (HIPAA-aligned).
- **FR-042**: Destructive or irreversible patient actions (cancel appointment, submit payment) MUST require explicit confirmation when the approved design specifies it.
- **FR-060**: Architecture MUST be HIPAA-ready (access control, audit, encryption, minimum necessary, vendor BAA gate before production PHI processing) without claiming completed certification in this specification.
- **FR-061**: On logout/session end, interactive client-controlled PHI caches for the portal MUST be cleared.

### Key Entities

- **Patient Portal Session Context**: The authenticated Patient identity used to scope all portal data and actions.
- **Patient Profile**: Account/personal details editable by the patient (name, contact, preferences).
- **Medical Profile**: Patient-maintained health background used for care context.
- **Patient Upload**: Patient-controlled file attachment (PDF/JPEG/PNG) with scan status and size limits.
- **Doctor Directory Entry**: Doctor information available for discovery and booking inside the portal.
- **Appointment**: Scheduled visit with doctor, time, mode (in-person/video), lifecycle state (Held→Confirmed→…), and allowed patient actions.
- **Slot Hold**: Temporary reservation (≤10 minutes) during booking.
- **Video Consultation**: Live telemedicine session bound to a video appointment with join window and audit trail.
- **Medical Record**: Clinical document or encounter summary visible to the patient; may include viewable attachments.
- **Lab Result**: Diagnostic result package with release state (Released / Retracted / etc.) and Preliminary/Final label.
- **Prescription**: Medication order with instructions and active/historical status.
- **Payment Obligation / Transaction**: Amounts owed or paid with Paid|Pending|Failed|Refunded and optional receipt.
- **Notification**: Patient-directed alert with category, read/dismissed state, optional deep link; display retention ≥90 days.
- **AI Conversation**: Patient-scoped assistant thread with messages, disclaimer, rate limits, ≤12-month retention.
- **Portal Preference**: Language and notification settings for the patient.
- **Audit Event**: Immutable security/clinical-access event for HIPAA-ready accountability.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 95% of verified patients can open the dashboard and recognize their welcome state within 30 seconds of successful sign-in on a standard broadband connection.
- **SC-002**: 90% of patients can complete Find Doctor → Book Appointment for an available slot in under 5 minutes on first attempt in moderated usability tests.
- **SC-003**: Appointment-related self-service (view upcoming, cancel/reschedule when allowed) succeeds without support contact for at least 90% of attempts in acceptance testing.
- **SC-004**: 100% of automated authorization tests confirm non-patients and other patients cannot read another patient’s appointments, records, labs, prescriptions, payments, notifications, uploads, or AI threads.
- **SC-005**: For video appointments inside the join window, patients can reach the consultation join state in under 2 minutes from the upcoming appointment detail in test environments.
- **SC-006**: Patients can locate at least one medical record, lab result, and prescription (when seeded) in under 1 minute from dashboard quick actions or navigation.
- **SC-007**: Outstanding payment status is visible on the dashboard whenever an unpaid obligation exists; paying an eligible test obligation updates status within 1 minute of confirmation without duplicate Paid charges on retry.
- **SC-008**: Critical appointment and result notifications appear in the portal notifications list within 1 minute of event creation in test conditions.
- **SC-009**: In bilingual QA, all primary portal screens render correctly in English and Arabic (RTL) with no truncated primary CTAs on approved mobile and desktop breakpoints.
- **SC-010**: Accessibility smoke checks on dashboard, booking, and records flows find no critical WCAG 2.2 AA blockers (keyboard traps, missing names on primary controls, insufficient contrast on primary text/buttons).
- **SC-011**: At least 80% of usability participants agree the AI assistant shortcut is easy to find and understand that it does not replace emergency/professional care.
- **SC-012**: Empty-state journeys (new patient with no appointments/records) still allow completion of profile edit and first booking without errors.
- **SC-013**: In fault-injection tests, a single dashboard widget failure leaves remaining widgets usable in 100% of cases.
- **SC-014**: 100% of document download and clinical detail view test actions emit an audit event suitable for ≥6-year retention policy verification.
- **SC-015**: Disallowed upload types and files over 10 MB are rejected in 100% of negative tests before becoming viewable.
- **SC-016**: Offline submit attempts during simulated connectivity loss never show false success for booking confirm or payment capture in acceptance tests.

## Assumptions

- Authentication, Patient role enforcement, session timeouts, and account security screens are provided by Module 1 (Authentication & Authorization) and are reused—not rebuilt—in this module.
- Approved Stitch Patient Portal designs exist (or will be exported into the feature design folder before UI implementation) and remain the visual/UX source of truth; no redesign is allowed.
- Doctor directory data for Find Doctors may reuse or extend the public doctor catalog, but booking and patient-specific views require an authenticated Patient.
- Appointment statuses include Held, Confirmed, Cancelled, Rescheduled (replacement), In progress, Completed, and No-show (exact labels follow Stitch/content).
- Cancel/reschedule allowed until 12 hours before start; inside that window patients cannot self-cancel/reschedule.
- v1 patient booking auto-confirms (no administrator approval queue for standard appointments).
- Soft slot hold duration is 10 minutes.
- Video join window is 15 minutes before start through 60 minutes after start (or until Completed/Cancelled).
- Patient cannot download telemedicine recordings in v1.
- Medical records, labs, and prescriptions are produced by care operations/doctor workflows (other modules); this module focuses on patient-safe viewing, search/filter, and document preview.
- Lab results shown to patients are only those Released to patient; Preliminary/Final labels apply.
- Prescription refill requests are out of v1 patient portal scope.
- Payments use an external provider; PAN/CVV not stored in Hakeem; payment intents are idempotent per obligation.
- Payment history default window is 24 months.
- Notification display retention is ≥90 days; PHI access audits retain ≥6 years.
- In-portal notifications are primary; email follows Settings when email delivery is configured.
- AI provides informational support only; uses only the patient’s own visible context; ≤12-month conversation retention; rate-limited.
- Uploads: PDF/JPEG/PNG, 10 MB max, 20 files max, malware scanned; patient-controlled attachments only.
- Document viewer is in-portal; no public unauthenticated links; downloads audited.
- List pagination default page size is 20; dashboard uses fixed widget caps.
- No offline-first PHI; reconnect refreshes server state.
- Localization strings for all patient portal surfaces are maintained for English and Arabic.
- Public marketing website pages remain separate; this module is the authenticated patient workspace after login.
- HIPAA-ready means control posture (encryption, access control, audit, minimum necessary, BAAs for PHI vendors)—not a certification assertion in this document.
- Administrators and doctors have their own modules for creating clinical artifacts; patients do not edit clinician-authored records.

## Out of Scope

- Doctor portal clinical charting, order entry, or doctor-side video host controls (beyond what the patient join experience requires).
- Administrator analytics/configuration UIs for the patient portal.
- Redesigning or replacing approved Stitch patient portal screens.
- Native iOS/Android apps (responsive web portal only for this module).
- Patient-to-patient messaging or social features.
- Insurance claims adjudication systems beyond displaying patient-facing payment status/history.
- Emergency services dispatch / live location sharing.
- Editing or deleting clinician-authored medical records, lab results, or prescriptions by the patient.
- Patient-initiated prescription refill workflow (v1).
- Patient download of telemedicine session recordings (v1).
- Offline-first clinical data entry or offline video consultation.
- Multi-patient household switching / guardian proxies (single patient identity per account in v1).
- Formal HIPAA certification / audit attestation as a deliverable of this module alone.
