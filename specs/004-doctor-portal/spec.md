# Feature Specification: Doctor Portal & Clinical Workspace

**Feature Branch**: `004-doctor-portal`

**Created**: 2026-07-30

**Status**: Draft

**Input**: User description: "Define the complete Doctor Portal for Hakeem. Only authenticated Doctors can access this module. Features: Doctor Dashboard, Today's Schedule, Upcoming Appointments, Patient Queue, Patient Details, Consultation Workspace, SOAP Notes, Clinical Summary, AI Medical Assistant, AI Clinical Documentation, AI Prescription Assistant, Create Prescription, Review & Sign Prescription, Medical Records, Lab Results & Imaging, Video Consultation, Notifications, Doctor Profile, Settings. Business goals: improve clinical workflow, reduce consultation time, improve documentation quality, assist doctors using AI, enable secure telemedicine, support digital prescribing, maintain healthcare privacy and compliance. Dashboard shows today's appointments, upcoming consultations, pending clinical notes, recent patients, notifications, AI assistant shortcut, daily statistics, and quick actions (Start Consultation, View Patient, Create Prescription, Review Lab Results, Complete SOAP Notes, Open AI Assistant). Must support responsive design, accessibility, English, Arabic, and RTL. UI already designed and approved in Stitch — do not redesign; Stitch is the single source of truth."

## Clarifications

### Session 2026-07-30

Non-interactive clarification pass: user directed no questions; enterprise-grade assumptions applied after validating doctor workflow, consultation lifecycle, clinical documentation, SOAP notes, AI documentation, AI prescription generation, digital signatures, medical record access, lab result review, notification workflow, video consultation, appointment management, offline/empty/error states, audit logging, and HIPAA-ready architecture. All decisions recorded below and reflected in Requirements, Assumptions, Edge Cases, User Stories, and Success Criteria.

- Q: Doctor day workflow & concurrent consultations? → A: Canonical flow: Dashboard/Schedule/Queue → View Patient (optional) → Start Consultation → Workspace (docs/Rx/labs/video/AI) → Complete visit → Pending notes if unsigned. v1 allows at most one In progress visit per doctor at a time; starting another requires completing, parking as Completed with pending notes, or marking No-show/Cancelled on the current visit first. Queue order default: earliest check-in time, then scheduled start.
- Q: Consultation lifecycle & completion gates? → A: States for doctor ops: Confirmed → Checked in/Waiting → In progress → Completed; also Cancelled, No-show, Rescheduled (from scheduling). Doctor may mark No-show from schedule/queue when patient did not attend. Completing a visit does NOT require finalized SOAP/summary in v1 (supports throughput) but creates/keeps Pending clinical notes until SOAP and Clinical Summary are each finalized or explicitly dismissed as “not required” with reason (audited). Cannot prescribe as if Completed while visit is Cancelled/No-show. Only assigned doctor may start/complete.
- Q: SOAP Notes & clinical summary rules? → A: At most one active SOAP note and one Clinical Summary per appointment/visit. Draft autosave on explicit save and on navigate-away when dirty (best-effort). Finalize requires non-empty Assessment and Plan for SOAP (Subjective/Objective may be empty with warning). Clinical Summary finalize requires non-empty summary body. After finalize: read-only; amendments create a new version linked to prior, require reason text, preserve prior immutable content, re-sign. Amendment allowed by original author within 72 hours; after 72 hours amendment still allowed but flagged “late amendment” in audit (no admin cosign gate in v1).
- Q: Digital signature semantics? → A: “Sign/finalize” for SOAP, Clinical Summary, and Prescriptions is an authenticated intentional act in-session: doctor must confirm a Review step then activate Sign. v1 does NOT require step-up MFA or wet-ink/certificate PKI; attribution is the authenticated Doctor user id + timestamp + immutable content hash/version id recorded in audit. Prescription sign is a separate act from note finalize. AI may never sign. Signed artifacts are legally attributable within platform policy as electronic clinician attestation (not a claim of specific jurisdictional e-Rx certification).
- Q: AI documentation & AI prescription generation? → A: AI Clinical Documentation may draft SOAP/summary fields from active visit context (chief complaint, structured chart highlights the doctor can already see, optional doctor prompts). AI Prescription Assistant may suggest editable medication lines (name, dose, frequency, duration, instructions) using the same authorized context + allergy list; suggestions never auto-add controlled-substance workflows beyond standard catalog items. Doctor must Accept (copies into draft) or Discard. Rate limit: ≤30 AI generations per doctor per hour across assistants; conversations/suggestion transcripts retained ≤12 months unless legal hold. Always show clinical-judgment disclaimer; AI MUST NOT diagnose as authority, MUST NOT finalize/sign, MUST NOT use other patients’ data. On failure/timeout: manual workflow continues.
- Q: Medical record access (doctor)? → A: Doctor may list/view records for patients in care relationship (assigned appointment, 24-month schedule window, or panel). May author new clinician notes/records only via SOAP/Clinical Summary/Prescription flows in v1 (no free-form “upload forged chart” tool). Historical records from other clinicians are read-only. Downloads/prints when design permits are individually audited. No PHI in URLs; opaque ids only.
- Q: Lab result & imaging review? → A: Doctors see Preliminary and Final results for authorized patients (broader than patient portal’s Released-only rule). Retracted/Superseded show as replaced with notice. Critical flags show prominent in-workspace banner. Optional “Mark reviewed” acknowledgement stores reviewer doctor id + timestamp (audited) but is not required to complete the visit in v1. Ordering new labs/imaging is out of v1 unless Stitch explicitly includes it—portal is review-centric.
- Q: Appointment management from doctor side? → A: Doctors manage operational status (start, complete, no-show) for assigned visits. Patient-driven cancel/reschedule remains Patient Portal rules (cancel/reschedule until 12h before). Doctors do not rebook slots in v1 (no doctor-side scheduling board beyond viewing Upcoming/Today). Rescheduled appearances show the replacement Confirmed appointment; original shows Rescheduled.
- Q: Notification workflow (doctor)? → A: In-portal primary; optional email mirror per Settings categories: appointments/queue, documentation (pending notes reminders), results (new lab/imaging), prescribing (sign failures / safety blocks are in-app only not email), system. Triggers include: patient checked in / waiting, visit starting soon (e.g., 10 min), new released/preliminary result on care-relationship patient, pending notes aging >24h after Completed, video patient waiting. Retain ≥90 days; unread badge; mark one/all read; dismiss hides from default list; deep links re-authorize. No PHI in email subjects/bodies beyond minimal necessary (prefer “You have a new result to review” + in-portal deep link).
- Q: Video consultation (doctor)? → A: Same join window as Patient Portal (15 min before start → 60 min after or until Completed/Cancelled). Doctor join creates/claims the session host role; waiting-room admit when design supports it. Only assigned doctor + appointment patient may join. Media encrypted via telemedicine provider; Hakeem stores metadata/audit not media blobs. No in-portal recording download in v1. Join/leave/admit/failures audited. Doctor may continue documentation if media fails.
- Q: Offline, empty, and error handling? → A: Every list/widget has empty state + primary CTA. Errors: user-safe copy, retry where safe, no stack traces/PHI leakage; dashboard widget isolation. Offline/connectivity loss: no offline-first PHI write cache; banner + disable Sign/Finalize/Complete/Start when unconfirmed; after reconnect, refresh authoritative server state and reconcile drafts by server version. Stale-version save → conflict notice + reload server draft (no silent overwrite of newer server content).
- Q: Audit logging & HIPAA-ready architecture? → A: Immutable audit (append-only) for: portal access grants/denials; patient chart views; record/lab/imaging views & downloads; consultation start/complete/no-show; SOAP/summary save/finalize/amend; prescription create/sign; AI generate/accept/discard; video join/leave/admit/fail; notification deep-link authorization failures. Retain audit ≥6 years. Minimum-necessary UI; TLS in transit; PHI encrypted at rest; anti-enumeration; no PHI in marketing analytics; session end clears interactive PHI from client storage under app control; Doctor idle session follows Auth module idle for non-admin clinical roles (30 minutes) unless Auth tightens further; break-glass emergency chart access out of v1 (hard deny without care relationship). Module is HIPAA-ready architecture, not certification. Vendors with PHI require BAA before production.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access doctor portal and clinical dashboard (Priority: P1)

An authenticated doctor lands on a personalized clinical dashboard that summarizes the day of care and provides quick actions into the highest-value clinical tasks.

**Why this priority**: The dashboard is the post-login clinical home and the hub for schedule, queue, documentation, prescribing, and AI shortcuts. Without it, doctors have no coherent workspace.

**Independent Test**: Sign in as a verified doctor; confirm the approved Stitch dashboard loads; confirm each dashboard section and quick action navigates correctly or shows an empty state; confirm non-doctors and guests cannot open the portal; confirm one widget failure does not blank others.

**Acceptance Scenarios**:

1. **Given** a verified doctor with an active session, **When** they open the doctor portal home, **Then** they see the approved Stitch dashboard including today's appointments (up to 8 in the widget), upcoming consultations (up to 5), pending clinical notes (up to 5), recent patients (up to 5), notifications summary (unread count + up to 5), AI assistant shortcut, daily statistics, and quick actions.
2. **Given** a doctor with no data in a section (e.g., no pending notes), **When** the dashboard loads, **Then** that section shows a clear empty state and a relevant call-to-action without errors.
3. **Given** the dashboard quick actions (Start Consultation, View Patient, Create Prescription, Review Lab Results, Complete SOAP Notes, Open AI Assistant), **When** the doctor activates any action, **Then** they are taken to the corresponding approved portal screen (or a guided select-patient/appointment flow when context is required).
4. **Given** an unauthenticated visitor or a signed-in Patient/Administrator, **When** they request any doctor portal URL, **Then** access is denied and they are redirected to the appropriate unauthorized or role-denied experience without exposing clinical data; the denial is audited.
5. **Given** a doctor using English or Arabic (including RTL), **When** they view the dashboard on desktop or mobile viewport sizes defined by the approved design, **Then** layout, text direction, and interactive controls match the Stitch source of truth and remain usable.
6. **Given** a transient failure loading one widget’s data, **When** the dashboard renders, **Then** other widgets still load and the failed widget shows a safe error with retry.

---

### User Story 2 - Manage today's schedule, upcoming appointments, and patient queue (Priority: P1)

A doctor reviews and operates on the day’s schedule, upcoming visits, and a live patient queue so care can start on time and in the right order.

**Why this priority**: Schedule and queue are the operational backbone of clinical workflow and consultation throughput.

**Independent Test**: Open Today’s Schedule, Upcoming Appointments, and Patient Queue; confirm list contents, status transitions (waiting → in consultation), no-show marking, single In progress constraint, empty/error states, and that only the doctor’s own panel is visible.

**Acceptance Scenarios**:

1. **Given** an authenticated doctor, **When** they open Today’s Schedule, **Then** they see appointments for the current local clinic day with time, patient display name, visit type (in-person/video), and status consistent with the approved design.
2. **Given** Upcoming Appointments, **When** the doctor opens the list, **Then** they see future confirmed appointments beyond today (paginated, page size 20), filterable by date range and status where the design provides filters.
3. **Given** Patient Queue, **When** patients are checked in or waiting for video admit, **Then** the queue shows ordered waiting patients (earliest check-in, then scheduled start) with elapsed wait indication and actions to start consultation or view patient details.
4. **Given** a scheduled visit and no other In progress visit for this doctor, **When** the doctor starts consultation from schedule/queue/dashboard, **Then** the visit moves to In progress, the start is audited, and the Consultation Workspace opens for that patient and appointment.
5. **Given** the doctor already has an In progress visit, **When** they attempt to start another, **Then** the system blocks start and prompts them to complete, resolve, or mark no-show/cancel on the current visit first.
6. **Given** a Confirmed or Waiting visit where the patient did not attend, **When** the doctor marks No-show, **Then** status becomes No-show, queue entry clears, and the action is audited.
7. **Given** appointments belonging to another doctor, **When** this doctor requests them by URL or ID, **Then** access is denied without confirming whether the appointment exists.
8. **Given** empty schedule or queue, **When** the doctor opens those screens, **Then** they see an empty state and guidance without errors.

---

### User Story 3 - View patient details and medical context (Priority: P1)

A doctor opens a patient chart summary to review identity-safe demographics, medical history highlights, allergies, medications, and recent encounters before or during a visit.

**Why this priority**: Safe, fast chart review reduces consultation time and clinical risk; it is required before documentation and prescribing.

**Independent Test**: Open Patient Details for an authorized patient; confirm sections match Stitch; attempt access to an unauthorized patient and confirm denial + audit; confirm allergies and critical flags are visually prominent when present.

**Acceptance Scenarios**:

1. **Given** an authenticated doctor with a care relationship to a patient (assigned appointment, appearance on the doctor’s schedule within 24 months, or panel assignment), **When** they open Patient Details, **Then** they see the approved chart summary including demographics permitted for clinical use, allergies, active medications, recent visits, and links to records/labs; the view is audited.
2. **Given** a patient with documented allergies or critical clinical flags, **When** Patient Details or Consultation Workspace loads, **Then** those alerts are prominently displayed before prescribing or documentation actions.
3. **Given** a patient the doctor is not authorized to access, **When** they request Patient Details, **Then** access is denied without leaking whether the patient exists; the denial is audited.
4. **Given** incomplete chart sections, **When** the doctor views the patient, **Then** missing sections show empty states and do not block opening Consultation Workspace for a scheduled visit.

---

### User Story 4 - Conduct consultation in the clinical workspace (Priority: P1)

A doctor runs a consultation (in-person or video-linked) from a dedicated workspace that keeps patient context, documentation, prescribing entry points, and AI aids in one place.

**Why this priority**: The consultation workspace is where workflow compression and documentation quality goals are realized.

**Independent Test**: Start a consultation from queue/schedule; confirm workspace loads with patient context; save drafts; complete visit with and without finalized notes; confirm pending-notes behavior; confirm audit of open/close.

**Acceptance Scenarios**:

1. **Given** an In progress appointment for the doctor, **When** they open Consultation Workspace, **Then** they see patient context, visit metadata, allergy/critical banners when present, and entry points for SOAP Notes, Clinical Summary, prescriptions, records/labs, video (when visit type is video), and AI assistants per the approved design.
2. **Given** an in-progress consultation, **When** the doctor saves draft documentation or navigates away with unsaved allowed autosave, **Then** drafts persist server-side and are recoverable if they return to the same visit.
3. **Given** the doctor ends the visit, **When** they mark the consultation Complete, **Then** appointment status becomes Completed (audited); if SOAP or Clinical Summary remain unsigned, they appear under Pending clinical notes until finalized or explicitly dismissed with reason.
4. **Given** a consultation interrupted (browser close/network loss), **When** the doctor returns after re-auth if needed, **Then** they can resume the same In progress visit with recovered server drafts.
5. **Given** another doctor’s visit or a Cancelled/No-show visit, **When** workspace mutation is attempted, **Then** inappropriate actions are blocked with clear messaging.
6. **Given** loss of connectivity, **When** the doctor attempts Complete/Sign, **Then** the action is blocked until the server confirms success.

---

### User Story 5 - Author SOAP notes and clinical summary (Priority: P1)

A doctor creates, edits, finalizes/signs, and (when needed) amends structured clinical documentation for a visit.

**Why this priority**: Documentation quality and reduced consultation time depend on clear SOAP and summary capture tied to the visit.

**Independent Test**: Create SOAP note for a visit; save draft; finalize with and without required fields; amend after finalization; confirm version immutability; confirm unauthorized users cannot read or write.

**Acceptance Scenarios**:

1. **Given** an in-progress or completed visit owned by the doctor, **When** they open SOAP Notes, **Then** they can enter Subjective, Objective, Assessment, and Plan sections matching the approved design (one SOAP per visit).
2. **Given** a draft SOAP note, **When** the doctor saves, **Then** the draft is stored, versioned for conflict detection, listed under pending clinical notes until finalized, and the save is attributable.
3. **Given** a SOAP note with non-empty Assessment and Plan, **When** the doctor completes Review & Sign/finalize, **Then** the note becomes read-only for routine editing, stores signer id + timestamp + content version identity, links to visit and patient, decreases pending-notes counts, and is audited.
4. **Given** empty Assessment or Plan, **When** finalize is attempted, **Then** the system blocks finalize and highlights required sections; empty Subjective/Objective only warn.
5. **Given** a finalized note requiring correction, **When** the doctor amends with a reason, **Then** a new signed version is created, prior content remains immutable and attributable, and late amendments (>72 hours) are flagged in audit.
6. **Given** Clinical Summary, **When** the doctor finalizes a non-empty summary body via Review & Sign, **Then** the same attribution and immutability rules apply as SOAP.
7. **Given** a patient or unauthorized role, **When** they attempt to create or finalize SOAP notes, **Then** access is denied and audited.

---

### User Story 6 - Create, review, and sign prescriptions (Priority: P1)

A doctor creates medication orders, reviews them for safety signals, and digitally signs them so patients receive prescriptions under patient-portal visibility rules.

**Why this priority**: Digital prescribing is an explicit business goal and a regulated clinical action.

**Independent Test**: Create a prescription for an authorized patient; review allergy/interaction warnings; sign via Review & Sign; confirm drafts hidden from patients; confirm AI cannot sign; confirm unauthorized access denied.

**Acceptance Scenarios**:

1. **Given** an authorized patient context and a non-Cancelled/No-show visit context when prescribing from a visit, **When** the doctor opens Create Prescription, **Then** they can add medication, dose, route, frequency, duration, quantity, and instructions per the approved design.
2. **Given** a draft prescription, **When** the doctor opens Review & Sign, **Then** they see a readable summary including patient identifiers appropriate for prescribing, allergy alerts, medication lines, and an explicit Sign control.
3. **Given** a conflicting allergy match detectable by the system, **When** the doctor attempts to sign, **Then** sign is blocked until the order is changed or policy-compliant override is unavailable in v1 for hard allergy matches (interaction warnings of high severity require explicit acknowledgement text/checkbox before sign).
4. **Given** a successful Sign by the authenticated doctor, **When** signing completes, **Then** the prescription becomes Active (or equivalent), stores signer attribution + timestamp + version identity, is auditable, and becomes available to the patient portal under patient-portal visibility rules; drafts remain invisible to patients.
5. **Given** AI Prescription Assistant suggestions, **When** accepted, **Then** they land only as editable draft lines and still require Review & Sign by the doctor.
6. **Given** unauthorized access (wrong doctor/role), **When** create/sign is attempted, **Then** the action is denied and audited.

---

### User Story 7 - Use AI clinical assistants (Priority: P2)

A doctor uses AI Medical Assistant, AI Clinical Documentation, and AI Prescription Assistant to accelerate safe documentation and prescribing suggestions—without replacing clinical judgment or signatures.

**Why this priority**: AI assistance is a stated business goal for reducing consultation time and improving documentation quality, but it must remain secondary to clinician authority.

**Independent Test**: Open each AI entry point; generate a suggestion; accept/edit/discard into SOAP or prescription draft; hit rate limit; confirm disclaimers; confirm AI cannot finalize/sign; confirm no cross-patient leakage; confirm retention posture.

**Acceptance Scenarios**:

1. **Given** an authenticated doctor in an authorized patient/visit context (or general medical Q&A mode where the design allows), **When** they open AI Medical Assistant, **Then** they can ask clinical support questions with an always-visible non-diagnostic / clinical-judgment disclaimer.
2. **Given** AI Clinical Documentation, **When** the doctor requests a draft SOAP/summary from visit context, **Then** suggested text is inserted only into draft fields after Accept; nothing is finalized without explicit doctor Review & Sign.
3. **Given** AI Prescription Assistant, **When** the doctor requests medication suggestions, **Then** suggestions appear as editable draft lines after Accept; signing still requires Review & Sign.
4. **Given** AI outputs, **When** the doctor accepts or discards them, **Then** generate/accept/discard events are audited with provenance metadata without exposing raw prompts to unauthorized parties.
5. **Given** the doctor exceeds 30 AI generations in an hour, **When** they request another, **Then** they see a rate-limit message and can continue manually.
6. **Given** AI service failure, **When** the doctor requests assistance, **Then** they see a safe error and can continue documenting/prescribing manually.
7. **Given** another patient’s data, **When** AI is invoked, **Then** the assistant only uses context the doctor is already authorized to view for the active patient/visit.

---

### User Story 8 - Review medical records, labs, and imaging (Priority: P2)

A doctor reviews clinician and facility records, laboratory results, and imaging reports relevant to their patients to inform care decisions.

**Why this priority**: Chart completeness during consultation depends on rapid access to historical records and diagnostics.

**Independent Test**: Open Medical Records and Lab Results & Imaging for an authorized patient; open Preliminary and Final results; mark reviewed; confirm unauthorized access denied; confirm empty/error states and audited views.

**Acceptance Scenarios**:

1. **Given** an authorized patient, **When** the doctor opens Medical Records, **Then** they see a paginated list of records they are permitted to view, with type, date, and source labeling per the approved design; views are audited.
2. **Given** Lab Results & Imaging, **When** the doctor opens the list, **Then** they see Preliminary and Final results (and notices for Retracted/Superseded), dates, and attention markers for critical results.
3. **Given** a selected record or result, **When** the doctor opens detail/viewer, **Then** content displays in-portal when the design provides a viewer; each view/download is authorized and audited.
4. **Given** a result detail, **When** the doctor chooses Mark reviewed (if shown), **Then** reviewer identity and timestamp are stored and audited without blocking visit completion if skipped.
5. **Given** no records/results, **When** lists load, **Then** empty states appear without errors.
6. **Given** unauthorized patient IDs, **When** records/labs are requested, **Then** access is denied without enumeration and the denial is audited.

---

### User Story 9 - Conduct video consultation (Priority: P2)

A doctor joins a secure video visit for telemedicine appointments, admits the patient when required, and continues clinical work even if media fails.

**Why this priority**: Secure telemedicine is an explicit business goal; video is required for virtual visit types.

**Independent Test**: Open a video-type appointment within the join window; join as doctor; admit patient; confirm leave/complete behaviors; confirm no recording download; confirm audit events.

**Acceptance Scenarios**:

1. **Given** a video appointment assigned to the doctor within the join window (15 minutes before start until 60 minutes after start or until Completed/Cancelled), **When** they join from schedule/workspace, **Then** the approved video consultation experience loads and join is audited.
2. **Given** a waiting patient and waiting-room UX in the design, **When** the doctor admits the patient, **Then** the patient enters the session and admit is audited.
3. **Given** media or device failure, **When** join fails, **Then** the doctor sees actionable recovery guidance, may continue documentation, and the failure is logged without exposing sensitive diagnostics to the UI.
4. **Given** a non-video appointment or outside the join window, **When** join is attempted, **Then** join is blocked with a clear reason.
5. **Given** v1 policy, **When** a session ends, **Then** doctors cannot download a full recording from the portal; join/leave/admit events remain auditable.

---

### User Story 10 - Notifications, profile, and settings (Priority: P3)

A doctor manages in-portal notifications, professional profile details, and portal preferences (including language) so the workspace stays accurate and usable.

**Why this priority**: Supporting hygiene for daily operations; secondary to core clinical actions but required for a complete portal.

**Independent Test**: Open Notifications, Profile, and Settings; verify category triggers; mark notifications read; update allowed profile/settings fields; switch language; confirm validation and persistence; confirm email mirror contains minimal PHI.

**Acceptance Scenarios**:

1. **Given** an authenticated doctor, **When** they open Notifications, **Then** they see a paginated list with unread indicators across categories (appointments/queue, documentation, results, system), can mark one/all read, dismiss items from the default list, and follow deep links that re-check authorization.
2. **Given** events such as patient checked in, visit starting soon, new lab/imaging on a care-relationship patient, or pending notes aging >24h after Completed, **When** those events occur, **Then** corresponding in-portal notifications are created (email only if the category is enabled in Settings, with minimal PHI).
3. **Given** Doctor Profile, **When** they view/edit allowed professional fields (e.g., display bio, languages, consultation preferences shown in design), **Then** changes persist after successful save and restricted credential fields follow policy.
4. **Given** Settings, **When** they update notification preferences or language (English/Arabic), **Then** preferences save and subsequent screens respect locale and RTL.
5. **Given** Settings includes security entry points from the auth module (password/sessions), **When** the doctor uses them, **Then** they reach those flows without improperly dropping clinical authorization context on return where the design keeps them in-portal.

---

### Edge Cases

- Doctor session expires mid-consultation: drafts already saved remain recoverable after re-authentication; unsaved field input may be lost; user is guided to re-enter the same visit when still In progress.
- Doctor attempts a second In progress visit: blocked until the current visit is Completed, No-show, or Cancelled.
- Two clinicians attempt the same appointment: only the assigned doctor may start/complete; others receive denial (audited).
- Patient cancels or no-shows while doctor is opening workspace: workspace shows updated status and blocks inappropriate actions (e.g., prescribe/sign as if visit active) with clear messaging.
- Complete visit with unsigned SOAP/summary: allowed; items remain in Pending clinical notes until finalized or dismissed with audited reason.
- Finalize SOAP with empty Assessment/Plan: blocked with field guidance.
- AI returns unsafe or empty suggestions: doctor can discard and continue manually; no auto-sign.
- AI rate limit exceeded: generation blocked with message; manual workflow continues.
- Allergy list unavailable due to upstream failure: prescribing shows a prominent “allergy data unavailable” warning and requires explicit acknowledgement before sign.
- Hard allergy match on ordered medication: sign blocked in v1 until medication changed.
- Concurrent edit of the same draft note: stale-version save shows conflict notice and reloads server draft; finalized notes are not silently overwritten.
- Video join when camera/mic permission denied: show permission guidance; allow continuing documentation without media.
- Localization missing string: fall back to the other supported language or a safe placeholder without breaking layout.
- Offline/connectivity loss during sign, finalize, start, or complete: block until server acknowledges success; show retry; never show success without confirmation; no offline-first PHI mutation cache.
- Deep link to a notification for a patient the doctor no longer may access: deny with safe message; audit denial.
- Retracted lab replaced by superseding result: show notice and point to current result.
- Break-glass access without care relationship: not available in v1 (hard deny).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow only authenticated users with the Doctor role to access doctor portal routes and clinical actions; Patients and Administrators MUST be denied without exposing clinical payloads; grants and denials MUST be audited.
- **FR-002**: System MUST present a Doctor Dashboard matching the approved Stitch design, including today's appointments, upcoming consultations, pending clinical notes, recent patients, notifications summary, AI assistant shortcut, daily statistics, and the specified quick actions.
- **FR-003**: Dashboard widgets MUST load independently so a single widget failure does not blank the entire dashboard; each widget MUST support empty, loading, and safe error+retry states.
- **FR-004**: Dashboard caps (v1): today's appointments widget up to 8; upcoming consultations up to 5; pending clinical notes up to 5; recent patients up to 5 distinct; notifications summary unread count + up to 5 newest unread; daily statistics for the current local clinic day (completed visits, remaining visits, pending notes count, average wait if available).
- **FR-005**: System MUST provide Today’s Schedule for the doctor’s appointments on the current local clinic day with status and start-consultation / view-patient / no-show actions as applicable.
- **FR-006**: System MUST provide Upcoming Appointments (future confirmed visits) with pagination (default page size 20), and status/date filters when present in the approved design.
- **FR-007**: System MUST provide a Patient Queue of waiting/checked-in patients for the doctor, ordered by earliest check-in then scheduled start, with start-consultation and view-patient actions.
- **FR-008**: Appointment clinical lifecycle for doctor operations MUST support: Confirmed → Checked in/Waiting → In progress → Completed; plus Cancelled, No-show, and Rescheduled. Doctors MUST be able to start, complete, and mark no-show on visits assigned to them. v1 MUST enforce at most one In progress visit per doctor.
- **FR-009**: Completing a visit MUST NOT require finalized SOAP/Clinical Summary; unsigned artifacts MUST remain in Pending clinical notes until finalized or dismissed with an audited reason.
- **FR-010**: System MUST provide Patient Details for care-relationship patients only (assigned appointment, 24-month schedule window, or panel), including clinically relevant demographics, allergies, active medications, and recent encounter highlights per Stitch; chart views MUST be audited.
- **FR-011**: System MUST provide a Consultation Workspace scoped to a doctor-owned appointment/patient context, aggregating documentation, prescribing entry, records/labs, video (when applicable), and AI entry points per Stitch, with prominent allergy/critical banners when present.
- **FR-012**: System MUST support at most one SOAP note and one Clinical Summary per visit, with Subjective/Objective/Assessment/Plan for SOAP; draft save; conflict detection on stale versions; Review & Sign finalize; and audited versioned amendments without silent overwrite of signed content.
- **FR-013**: SOAP finalize MUST require non-empty Assessment and Plan; Clinical Summary finalize MUST require non-empty body; Subjective/Objective may be empty with warning only.
- **FR-014**: Amendments MUST capture reason text, preserve prior immutable versions, re-sign, and flag amendments occurring more than 72 hours after original finalize as late amendments in audit.
- **FR-015**: Digital Sign/Finalize for SOAP, Clinical Summary, and Prescriptions MUST be an explicit authenticated Review-then-Sign act recording signer doctor id, timestamp, and content version identity in immutable audit; v1 does NOT require step-up MFA or PKI certificates; AI MUST NEVER sign.
- **FR-016**: System MUST support Create Prescription and Review & Sign Prescription flows; only signed prescriptions are released to patient-facing views; drafts remain doctor-only; prescribing MUST be blocked for Cancelled/No-show visits when visit-scoped.
- **FR-017**: Before prescription sign, system MUST surface known allergy conflicts and available interaction warnings; detectable hard allergy matches MUST block sign in v1 until the order changes; high-severity interactions MUST require explicit acknowledgement before sign; if allergy data is unavailable, sign requires explicit acknowledgement of that limitation.
- **FR-018**: System MUST provide AI Medical Assistant, AI Clinical Documentation, and AI Prescription Assistant entry points per Stitch; AI output enters drafts only after Accept; AI MUST NOT finalize/sign; rate limit ≤30 generations/doctor/hour; suggestion/conversation retention ≤12 months unless legal hold; persistent clinical-judgment disclaimer required.
- **FR-019**: AI MUST use only data the doctor is authorized to view for the active context; generate/accept/discard MUST be audited; failures MUST degrade to manual workflow.
- **FR-020**: System MUST provide Medical Records and Lab Results & Imaging lists/details for authorized patients; doctors MAY view Preliminary and Final labs/imaging; Retracted/Superseded MUST show replacement notices; critical flags MUST be prominent; optional Mark reviewed stores audited acknowledgement; new lab/imaging ordering is out of v1 unless present in Stitch.
- **FR-021**: Record/lab/imaging views and downloads MUST be authorized and audited; clinician-authored historical content from others is read-only; v1 authoring of clinical content is via SOAP, Clinical Summary, and Prescription flows.
- **FR-022**: System MUST support Video Consultation join for video visit types within the join window (15 minutes before start through 60 minutes after start or until Completed/Cancelled); doctor is session host; admit when design supports waiting room; join/leave/admit/failures MUST be audited; v1 MUST NOT offer in-portal recording download; media blobs are not stored in Hakeem.
- **FR-023**: System MUST provide an in-portal Notifications center (primary channel) with categories: appointments/queue, documentation, results, system; triggers include check-in/waiting, visit starting soon (~10 min), new preliminary/final results on care-relationship patients, pending notes aging >24h after Completed, video patient waiting; retain ≥90 days; mark one/all read; dismiss; deep links MUST re-authorize; optional email mirror uses minimal PHI.
- **FR-024**: System MUST provide Doctor Profile and Settings screens per Stitch, including language preference (English/Arabic) that drives locale and RTL, and notification preference toggles for mirrored email categories when email mirror is enabled.
- **FR-025**: All doctor portal screens MUST implement responsive layouts and accessibility behaviors defined by the approved Stitch design (keyboard reachability for primary actions, visible focus, sufficient contrast, meaningful names for icon-only controls). WCAG 2.2 AA is the v1 target for primary flows where feasible within Stitch constraints.
- **FR-026**: System MUST support English and Arabic locales with correct RTL layout for Arabic across portal chrome and clinical screens.
- **FR-027**: Approved Stitch designs are the single UI source of truth for this module; implementation MUST NOT invent alternate information architecture or visual redesigns that conflict with approved screens.
- **FR-028**: System MUST enforce HIPAA-ready controls: minimum-necessary display; authorization on every clinical read/write; no PHI in URLs/query strings; anti-enumeration on patient and appointment identifiers; TLS in transit; PHI encrypted at rest; no PHI in third-party marketing analytics; session end clears interactive PHI from client storage under app control; break-glass without care relationship is out of v1; vendors handling PHI require BAA before production. This is readiness architecture, not a certification claim.
- **FR-029**: System MUST write immutable (append-only) audit events retained ≥6 years for: access grant/deny; chart views; record/lab/imaging view/download; consultation start/complete/no-show; SOAP/summary save/finalize/amend/dismiss; prescription create/sign; AI generate/accept/discard; video join/leave/admit/fail; notification deep-link authorization failures.
- **FR-030**: List screens MUST support pagination (default 20) and the search/filter controls present in Stitch; stable default sort is soonest/newest first as appropriate; dashboard widgets use fixed caps (not full pagination).
- **FR-031**: Every primary list/widget MUST provide empty and error states with user-safe messages (no stack traces or PHI leakage); connectivity loss MUST block Start/Complete/Sign/Finalize until the server confirms success; no offline-first cache for PHI mutations; after reconnect, refresh authoritative server state.
- **FR-032**: Quick actions that require patient context MUST either use the active consultation/queue selection or prompt the doctor to select an authorized patient/appointment before proceeding.
- **FR-033**: Pending clinical notes MUST include unsigned/draft SOAP and clinical summaries after visit Completed (and optionally still-open drafts); dashboard pending count MUST reflect these items; aging >24h SHOULD raise a documentation notification.
- **FR-034**: Doctor portal chrome (sidebar/top navigation per Stitch, including search/notifications/profile affordances when present in design) MUST remain distinct from marketing site chrome and from patient portal chrome while reusing shared authentication session rules from the auth module.
- **FR-035**: Doctor-side appointment management in v1 is operational status only (start/complete/no-show/view); patient cancel/reschedule rules remain as defined in Patient Portal; doctors do not operate a full rebooking board in v1.

### Key Entities

- **Doctor profile**: Professional identity for a Doctor-role user (display name, specialty presentation, languages, preferences, timezone) used across portal chrome and patient-facing doctor cards where applicable.
- **Care relationship**: Authorization basis binding a doctor to a patient via assigned appointment, 24-month schedule window, or panel assignment.
- **Appointment (clinical view)**: Scheduled encounter assigned to the doctor with timing, visit type, status (Confirmed, Checked in/Waiting, In progress, Completed, Cancelled, No-show, Rescheduled), patient reference, and queue/check-in state.
- **Patient queue entry**: A waiting or admit-ready patient tied to an appointment and doctor, with check-in time, wait timing, and allowed actions.
- **Consultation / visit workspace context**: Active clinical session binding doctor, patient, and appointment for documentation, prescribing, video, and AI (max one In progress per doctor).
- **SOAP note**: Structured visit documentation (S/O/A/P) with draft/final states, authorship, immutable versions/amendments (reason, late flag), content version identity, and audit metadata.
- **Clinical summary**: Visit-level narrative summary artifact with draft/final states, attribution, and versioning rules aligned to SOAP.
- **Prescription**: Medication order set with draft and signed states, line items, instructions, safety acknowledgements, signer attribution, and release rules to patients.
- **Digital signature attestation**: Platform record of signer doctor id, timestamp, artifact type, and content version identity for finalize/sign acts (session-authenticated; not PKI in v1).
- **Medical record item**: Clinician- or facility-authored record entry visible to authorized doctors (historical third-party content read-only).
- **Lab/imaging result**: Diagnostic order/result with Preliminary/Final/Retracted/Superseded status, criticality, optional reviewed acknowledgement, and report content/viewer reference.
- **Video session**: Telemedicine media session metadata (join window, host doctor, participants, admit state, audit events)—not a downloadable recording in v1.
- **Notification**: In-portal message to the doctor with category, read/dismissed state, trigger source, and authorized deep link target.
- **AI assistance artifact**: Suggested documentation or prescription content with disclaimer, rate-limit metadata, retention ≤12 months, and provenance when accepted into a draft.
- **Audit event**: Append-only compliance record of sensitive actions retained ≥6 years.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Verified doctors reach a usable clinical dashboard in under 30 seconds after successful login on a standard broadband connection.
- **SC-002**: Doctors can start a consultation from schedule or queue and open the consultation workspace in under 10 seconds from action to interactive workspace on standard broadband.
- **SC-003**: In usability validation with at least 5 doctors, ≥90% can complete a draft SOAP note for a sample visit without assistance on the first attempt.
- **SC-004**: In the same validation set, ≥90% can create and sign a simple single-medication prescription (happy path) in under 3 minutes including review.
- **SC-005**: 100% of attempted doctor-portal accesses by Patient or Administrator accounts in role tests are denied without clinical data exposure.
- **SC-006**: For localized QA, 100% of primary navigation labels and critical clinical actions are available in both English and Arabic with correct RTL behavior on Arabic.
- **SC-007**: Dashboard remains partially usable when a single widget fails: at least the remaining widgets render in fault-injection tests.
- **SC-008**: Time-to-open Patient Details for an authorized patient is under 3 seconds to first meaningful chart content on standard broadband in performance checks.
- **SC-009**: Video join success for eligible visits reaches ≥95% in staging telemedicine dry-runs when devices and network meet published minimums (failures show recovery guidance).
- **SC-010**: After AI documentation suggestion acceptance tests, clinicians still perform an explicit finalize/sign action in 100% of finalized notes and signed prescriptions (no silent AI finalization/sign).
- **SC-011**: Audit spot-checks show required view/sign/join/start/complete events recorded for 100% of sampled sensitive actions in test runs.
- **SC-012**: Implementation walkthrough confirms primary screens match approved Stitch layouts for information hierarchy (no competing redesign) prior to release candidate.
- **SC-013**: Attempts to start a second concurrent In progress visit are blocked in 100% of role tests.
- **SC-014**: Hard allergy-match prescription sign attempts remain blocked in 100% of safety tests until the order is changed.
- **SC-015**: Offline fault-injection during Sign/Finalize/Complete never shows a success state without server confirmation in 100% of trials.
- **SC-016**: SOAP finalize with empty Assessment or Plan is rejected in 100% of validation tests.

## Assumptions

- Authentication, session management, and Doctor role enforcement are provided by the existing Auth & RBAC module; this feature consumes those guarantees rather than redefining login. Doctor idle timeout follows Auth non-admin clinical idle (30 minutes) unless Auth is later tightened.
- Patient Portal appointment booking and patient-visible prescriptions/records already define cross-portal visibility rules; Doctor Portal authors/releases clinical artifacts that patients later consume under those rules (patients see Released labs; doctors see Preliminary + Final).
- Care relationship for chart access in v1: assigned on the appointment, patient on the doctor’s schedule within a rolling 24-month window, or explicit panel assignment—no open-world patient search; no break-glass in v1.
- Clinic “local day” and daily statistics use the doctor’s profile timezone when set, otherwise the organization default timezone.
- Queue check-in may be performed by clinic staff or inferred from patient video waiting-room presence; staff console is out of scope unless already present—doctor portal consumes queue state.
- Canonical doctor workflow and single In progress visit constraint are product policy for v1 throughput and safety.
- Visit completion without finalized notes is allowed to protect clinic throughput; pending-notes + notifications enforce documentation quality afterward.
- Digital signatures in v1 are authenticated electronic attestations (Review & Sign), not PKI/wet-ink; jurisdictional e-Rx certification programs are out of scope unless later mandated.
- Drug–allergy and interaction checking uses the best available structured data; hard allergy matches block; high-severity interactions require acknowledgement; incomplete coding yields partial-check warnings.
- AI providers are PHI-capable processors only under BAA; prompts minimized; output advisory; ≤30 generations/doctor/hour; transcripts ≤12 months unless legal hold.
- Telemedicine media is delivered by an approved provider with transport encryption; Hakeem stores session metadata and audit, not raw media blobs in v1.
- Lab/imaging ordering is out of v1 (review-centric); Mark reviewed is optional.
- Doctor-side rebooking/scheduling board is out of v1; operational status changes only.
- Controlled-substance special registries beyond standard catalog prescribe/sign are out of scope unless represented in approved Stitch screens.
- Covering-doctor handoff is out of v1 unless design explicitly includes it.
- Stitch MCP holds the approved UI for this module (including inside top navigation when present); visual QA compares implementation to those screens.
- Accessibility target for v1 is WCAG 2.2 AA for primary flows where feasible within the approved design constraints.
- Administrators may have separate operational tools outside this module; Doctor Portal does not double as an admin console.
- Notifications email mirror is optional and category-gated; in-portal remains source of truth for unread state; email uses minimal PHI.
- HIPAA-ready means architectural and procedural readiness (audit, access control, encryption, BAA gates)—not a claim of HIPAA certification.
- Immutable audit retention ≥6 years aligns with common HIPAA documentation retention expectations used elsewhere in Hakeem modules.
