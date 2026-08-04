# Feature Specification: Electronic Medical Records (EMR)

**Feature Branch**: `007-electronic-medical-records`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "Module 6: Electronic Medical Records (EMR) — clinical core of Hakeem that securely manages patient medical records, diagnoses, allergies, medications, laboratory results, prescriptions, clinical encounters, medical documents, and longitudinal patient history. Shared between Patients, Doctors, and Administrators through RBAC. UI already designed and approved using Stitch MCP — do not redesign; Stitch is the single source of truth. Features: Patient Medical Record (summary, medical history, allergies, chronic conditions, family history, immunizations, lifestyle, emergency information); Clinical Records (encounters, diagnoses, SOAP notes, doctor notes, treatment plans, care plans); Prescriptions (active, medication history, renewals); Laboratory (lab results, medical imaging, diagnostic reports); Medical Documents (referrals, certificates, uploads, consent forms); Timeline (medical timeline, visit history, appointment history). Business goals: centralize health records, improve clinical decision making, maintain complete longitudinal record, support AI-powered healthcare, ensure compliance and privacy. Must support English, Arabic, RTL, and accessibility."

## Clarifications

### Session 2026-08-04

Informed defaults applied for a shared clinical EMR module (aligned with Patient Portal, Doctor Portal, Admin Portal, Auth/RBAC, and Platform Services). Decisions below are reflected in Requirements, Assumptions, Edge Cases, User Stories, and Success Criteria.

- Q: What is Module 6 relative to existing portals? → A: EMR is the **shared clinical record core**—authoritative clinical data, rules, and Stitch-defined EMR surfaces—consumed by Patient, Doctor, and Administrator experiences. It does **not** introduce a separate fourth end-user portal shell. Role-specific navigation remains in each portal; EMR owns clinical content integrity, longitudinal history, and consistent RBAC for chart data.
- Q: Who authors vs who views? → A: **Doctors** author and finalize clinical encounters, diagnoses, SOAP/notes, treatment/care plans, prescriptions, and clinician-issued documents. **Patients** view their own chart under release rules; may maintain limited **self-reported** profile sections (e.g., lifestyle, family history, emergency contacts, patient-asserted allergies) when Stitch provides those controls—patient-asserted clinical claims are labeled as patient-reported and do not replace clinician-attested entries. **Administrators** have read/oversight and compliance access (search/export under policy) and may manage document holds or release flags when Stitch provides ops controls; they do **not** routinely author SOAP, prescriptions, or diagnoses as clinicians.
- Q: Relationship to Patient/Doctor portal “records” features? → A: Earlier portal specs define role UX for viewing/authoring. EMR **centralizes and completes** the longitudinal chart (summary, allergies, chronic conditions, immunizations, care plans, renewals, imaging/reports, consent, unified timeline) so portals consume one clinical source of truth instead of fragmented copies.
- Q: Prescription renewals? → A: **Doctor-initiated renewals** of an eligible active/recent prescription are in EMR v1 (new signed order linked to prior). **Patient self-service refill request** remains out of v1 (consistent with Patient Portal). Renewal creates a new prescription version/order; prior signed content stays immutable.
- Q: Lab, imaging, diagnostic reports? → A: Same release model as existing portals: patients see items **Released to patient**; doctors see Preliminary and Final for care-relationship patients; Retracted/Superseded are not shown as current. Critical flags surface prominently to clinicians; patient UI uses non-alarmist guidance. Ordering new labs/imaging is out of EMR v1 unless Stitch includes an explicit order workflow—EMR is review-and-store centric for results.
- Q: SOAP / notes / plans? → A: Align with Doctor Portal rules: one active SOAP and one Clinical Summary per encounter/visit; draft → finalize/sign with immutability; amendments create new versions with reason. Treatment Plans and Care Plans are structured longitudinal artifacts (goals, interventions, status) that may span encounters; updates are versioned; finalized sections follow sign/attestation rules when Stitch marks them as signed clinical content.
- Q: Medical documents & consent? → A: Documents include referral letters, medical certificates, patient/clinician uploads, and consent forms. Storage and malware screening use Platform file/document capabilities. Signed clinical documents are immutable. Consent forms record patient acknowledgment with timestamp and version of consent text; withdrawal is recorded without deleting the historical consent event.
- Q: Timeline? → A: A single **Medical Timeline** presents chronological care events (encounters, diagnoses, prescriptions, labs/imaging releases, key documents, appointments/visits) with role-filtered visibility. Appointment History and Visit History are timeline facets, not separate conflicting histories.
- Q: AI support? → A: EMR exposes authorized structured chart context to Platform AI assistants used by Patient/Doctor. AI **MUST NOT** finalize/sign clinical artifacts, alter billing, or write silent chart changes. AI drafts remain suggestions until a clinician accepts them into drafts per Doctor Portal rules.
- Q: Privacy, compliance, audit? → A: Chart access is RBAC + care relationship (patient self, treating/assigned doctor, admin under policy). Every sensitive view/export/download is auditable. Append-only security audit remains UI-immutable. Soft-delete/hide for end users does not purge compliance history. Module is **HIPAA-ready architecture**, not a certification claim. Production vendors with PHI require contractual BAA/equivalent before go-live (ops gate).
- Q: Localization & accessibility? → A: English and Arabic with full RTL for Arabic on all EMR Stitch surfaces; locale follows authenticated user preference. Accessibility: keyboard operable primary flows, visible focus, meaningful labels/names, sufficient contrast per approved design, and screen-reader-friendly structure for critical alerts (allergies, critical results).
- Q: Emergency information? → A: Emergency contacts and critical medical alerts (severe allergies, major conditions flagged for emergency) are visible to authorized clinicians at chart open; patient may update emergency contact fields; clinicians may flag critical clinical alerts. No public anonymous chart access.
- Q: Out of scope for EMR v1? → A: Full hospital ADT/HL7 inbound federation, e-prescribing network certification, DICOM PACS workstation, patient refill requests, break-glass without care relationship, and clinician role impersonation by Admin.

### Session 2026-08-04 (non-interactive re-clarify)

User directed: review EMR specification; **do not ask questions**; identify missing business/technical requirements; apply enterprise-grade assumptions; document every assumption; validate Record ownership, RBAC permissions, PHI protection, Medical privacy, Clinical versioning, Audit logging, Soft delete strategy, Attachments, Timeline integrity, Data retention, Consent management, ICD-10 readiness, HL7/FHIR compatibility, and Search & filtering.

**Validation outcome:** Prior Clarifications covered authorship, release rules, Stitch, renewals, and high-level privacy. Residual enterprise gaps for the 14 areas are filled below and encoded as FR-035–FR-048 plus Assumptions, Edge Cases, and Success Criteria updates. No contradictory prior decisions were overturned.

- Q: Record ownership? → A: The **Patient Chart is owned by the patient identity** (one chart per patient account). Clinical artifacts are **custodied by Hakeem** under platform retention/legal-hold rules. **Authorship** is distinct from ownership: clinician-attested entries record authoring clinician + organization context; patient-reported entries record the patient as author. Doctors do not “own” the chart; they hold time-bounded **care-relationship access**. Administrators hold **oversight custody access**, not clinical ownership. Chart merge of duplicate patients is **out of v1** (ops runbook only if ever needed).
- Q: RBAC permissions (matrix)? → A: Canonical matrix — **Patient**: read own released chart; write self-reported profile domains only; download own allowed attachments; acknowledge/withdraw own consents; no sign/renew Rx, no release labs, no amend signed notes. **Doctor (care relationship)**: read full clinician chart including Preliminary diagnostics; write drafts; sign/amend own authored clinical content per versioning rules; renew Rx; upload clinician documents; release diagnostics to patient when Stitch provides release control; mark results reviewed. **Doctor (no care relationship)**: deny all chart PHI. **Administrator**: read oversight views; export/hold when designed; manage release flags/holds when designed; **deny** clinical sign/prescribe/amend-as-author. Role checks apply on every list/detail/download/mutation—not UI-only hiding.
- Q: PHI protection? → A: All EMR content is treated as **PHI/sensitive health data**. Transport MUST use encrypted channels (HTTPS/TLS). Data MUST be encrypted **at rest** via platform storage. UI applies **minimum necessary** display (no full chart dump in notifications/email). Opaque resource identifiers in URLs (no names/MRNs in paths). Client interactive caches MUST NOT retain PHI after session end under app control. Downloads use **short-lived** controlled access (align Platform ≤15 minutes) or authenticated streams—**no permanent public object URLs**. Cross-patient search MUST NOT leak existence of other charts beyond safe denial.
- Q: Medical privacy? → A: **Purpose limitation**: chart access only for care, patient self-management, or admin support/compliance—not marketing. **Confidentiality**: no sharing chart contents to unauthorized roles. Email/SMS about clinical events use **minimal necessary** copy (prefer “new result available” + in-portal deep link). Deep links **re-authorize** on open. Optional clinician “sensitive note” marking (if Stitch provides) further restricts patient visibility until released. No secondary use of chart PHI for advertising analytics in v1.
- Q: Clinical versioning? → A: Signed/finalized clinical artifacts (SOAP, clinical summary, signed prescriptions, signed certificates, signed plan sections) are **immutable**. Amendments/renewals create a **new version or new order** with: prior version link, reason (when amendment), actor, timestamp, and content identity. Drafts may overwrite in place with **optimistic concurrency** (version token); conflict warns the user. Timeline and chart “current” views show the latest effective version; prior versions remain readable to authorized clinicians and compliance. Soft-hide never destroys version history.
- Q: Audit logging? → A: Append-only, UI-immutable security audit for: chart open/summary view; section list/detail views that expose PHI; attachment download; diagnostic release/retract; consent ack/withdraw; sign/finalize/amend; Rx create/sign/renew; soft-delete/restore/hide; admin export/hold; authorization denials. Each event: actor, action, target type/id, outcome, timestamp, request metadata when available, optional reason. Retention of security audit ≥**6 years** (align Doctor/Admin clinical audit floors). EMR does not replace Platform/Auth audit streams; it emits EMR-specific action types into the shared immutable audit.
- Q: Soft delete strategy? → A: Product “delete” of chart attachments or patient-visible items is **soft-delete / hide**: item leaves default patient/clinician lists but remains in custody for retention/legal hold. **Restore** allowed for author or admin when designed, audited. **Hard delete from product UI is forbidden** for PHI-bearing chart history in v1. Soft-deleted items still appear in compliance/admin views when policy requires and still generate timeline tombstone/hide events when designed. Signed artifacts cannot be soft-deleted in a way that removes audit or version chain—only suppress from casual lists.
- Q: Attachments? → A: Attachments are chart-linked files (uploads, report PDFs, certificate renders) via Platform medical document/storage capabilities. Allowed types/sizes follow Platform defaults (documents/images commonly used in care; default max **25 MB** unless product tightens). **Malware/safety screening fail-closed**. Classification required (referral, certificate, consent scan, lab PDF, imaging report, other). Access = same RBAC as parent chart item. Download/view individually audited. Attachments on signed clinical documents inherit immutability (no silent byte replace); amendments attach new files to new versions.
- Q: Timeline integrity? → A: Timeline is a **derived, append-friendly projection** of authoritative chart/care events—not a separately editable diary. Events are ordered by clinical effective time (fallback: recorded time), stable event id, and type. Corrections (retract lab, amend note, soft-hide document) add **compensating events** or status markers; they do **not** rewrite history silently. Appointment/visit facets MUST reflect the same underlying appointment states as Patient/Doctor modules (single source). Role filters change visibility, never invent alternate chronologies. Pagination/windowing MUST NOT drop ordering guarantees within a page.
- Q: Data retention? → A: **Clinical chart retention** default ≥**6 years** from last clinically material update (or longer if legal hold)—aligned with clinical audit floors; not a promise of a specific jurisdiction’s statute without counsel review. **Security audit** ≥6 years. **Operational EMR diagnostics** (non-PHI or redacted) ≥30 days online (Platform ops floor). Legal hold freezes soft-delete purge candidates. Post-retention destruction is an **ops/legal runbook** outside product “empty trash” UX in v1. Patients closing accounts do **not** hard-wipe chart PHI from product UI while retention/hold applies.
- Q: Consent management (enterprise)? → A: Consents are typed (e.g., telemedicine, treatment, data sharing) with **versioned consent text**. Acknowledgment stores actor, timestamp, locale, text version id, and optional evidence (checkbox attestation). **Withdrawal** appends a withdrawal event; flows requiring that consent type block until re-consent. Minors/proxy consent is **out of v1** unless Stitch explicitly includes guardian flows—default assumes adult patient account holder. Marketing/research consents are out of EMR clinical scope in v1. Consent state is visible to authorized clinicians/admin for care gating.
- Q: ICD-10 readiness? → A: Diagnoses MUST support **optional ICD-10 (or ICD-10-CM) codes** alongside display text. Clinicians may save **text-only** diagnoses in v1 when a code is unknown; coded entries preferred when catalog search is used. Problem list / encounter diagnoses store code + display when provided. No claim of complete national coding certification or automated coding AI authority. Catalog search/filter for codes is in scope when Stitch includes diagnosis pickers; free-text fallback always allowed for care continuity.
- Q: HL7/FHIR compatibility? → A: v1 does **not** operate a live HL7v2 ADT feed or certified FHIR server for external EHR federation. EMR MUST keep clinical entities in a **structured, export-friendly model** (patient, encounter, condition/diagnosis, allergy, medication request, observation/result, document reference, consent) so a future FHIR R4 mapping is feasible without chart redesign. Optional **admin/compliance export** of a patient’s permitted chart package (human-readable + structured summary) when Stitch provides export—audited. Inbound HL7/FHIR ingestion remains out of v1.
- Q: Search & filtering? → A: Within an authorized chart, users can **search/filter** lists (documents, results, prescriptions, timeline, diagnoses) by text on titles/labels, status, date range, and type when Stitch provides controls. Default sort: newest/soonest clinically relevant first. Default page size **20** for lists; timeline windowed. **Cross-patient clinical search** is Admin-only (and Doctor panel search limited to care-relationship patients)—never a public chart search. Search MUST enforce the same RBAC/release rules as browse (no bypass via query). Empty and no-match states are safe and non-enumerating across patients.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Patient Summary & Core Chart (Priority: P1)

An authorized user opens a patient’s EMR summary and sees a coherent clinical snapshot: demographics allowed for care, allergies, chronic conditions, active medications, recent encounters, and emergency/critical alerts—matching the approved Stitch summary layout.

**Why this priority**: The summary is the primary clinical decision-support surface and the entry point to the longitudinal chart.

**Independent Test**: Open chart as patient (self), as assigned doctor, and as admin; confirm summary sections render; confirm unauthorized users are denied and audited; confirm allergy/critical alerts are prominent for clinicians.

**Acceptance Scenarios**:

1. **Given** an authenticated patient, **When** they open their Medical Record summary, **Then** they see their own approved Stitch summary (history highlights, allergies, conditions, medications, emergency info as designed) without other patients’ data.
2. **Given** a doctor with a care relationship, **When** they open the patient’s EMR summary, **Then** they see clinician-grade summary including allergies, chronic conditions, active meds, recent visits, and emergency/critical alerts; the view is audited.
3. **Given** documented severe allergies or critical flags, **When** the summary or encounter workspace loads for a clinician, **Then** those alerts are prominently displayed before prescribing or documentation actions.
4. **Given** a user without authorization, **When** they request another person’s chart, **Then** access is denied without leaking whether the record exists beyond safe messaging, and the denial is audited.

---

### User Story 2 - Maintain Patient-Reported Medical Profile Sections (Priority: P1)

A patient maintains allowed self-reported sections (e.g., lifestyle, family history, emergency contacts, patient-asserted allergies/conditions where Stitch allows edit), while clinician-attested entries remain protected.

**Why this priority**: Accurate intake and emergency info improve safety; labeling patient-reported vs clinician-attested prevents false certainty.

**Independent Test**: Patient edits lifestyle and emergency contact; attempt to edit a signed clinician diagnosis and confirm blocked; doctor sees patient-reported labels.

**Acceptance Scenarios**:

1. **Given** an authenticated patient, **When** they update lifestyle, family history, or emergency information on the approved screens, **Then** changes persist and appear on subsequent views with a patient-reported attribution where applicable.
2. **Given** clinician-attested allergies, diagnoses, or signed notes, **When** the patient attempts to alter them, **Then** the system prevents modification and keeps content read-only.
3. **Given** a doctor viewing the chart, **When** patient-reported and clinician-attested items coexist, **Then** the UI distinguishes their source clearly per Stitch.

---

### User Story 3 - Clinical Encounters, Diagnoses & Documentation (Priority: P1)

A doctor documents clinical encounters with diagnoses, SOAP notes, doctor notes, and links documentation to the visit so the longitudinal record stays complete.

**Why this priority**: Encounter documentation is the backbone of clinical decision making and compliance.

**Independent Test**: Start/complete an encounter; write SOAP draft; finalize; add diagnosis; confirm patient sees only appropriate released summaries; confirm amendment versioning.

**Acceptance Scenarios**:

1. **Given** an authorized doctor and an eligible visit, **When** they open the encounter documentation surfaces, **Then** they can create/edit draft SOAP notes and doctor notes per Stitch and associate diagnoses with the encounter.
2. **Given** a SOAP with required Assessment and Plan content, **When** the doctor finalizes/signs, **Then** the note becomes read-only for routine edit, stores attributable signer identity and time, and is audited.
3. **Given** a finalized note, **When** the doctor amends with a reason, **Then** a new version is created, the prior version remains immutable, and the amendment is audited.
4. **Given** a patient, **When** they view encounter-related records released to them, **Then** they see patient-safe summaries/documents without draft clinician workspace content that Stitch marks clinician-only.

---

### User Story 4 - Treatment Plans & Care Plans (Priority: P2)

Clinicians create and update treatment and care plans that span visits, with goals and status visible to authorized roles per design.

**Why this priority**: Longitudinal planning improves continuity beyond single encounters.

**Independent Test**: Create a care plan with goals; update status; confirm patient visibility rules; confirm unauthorized access denied.

**Acceptance Scenarios**:

1. **Given** an authorized doctor, **When** they create a treatment or care plan for a patient, **Then** the plan is stored with status, goals/interventions as designed, and appears in the chart and timeline.
2. **Given** an active plan, **When** the doctor updates progress/status, **Then** the update is versioned/attributable and prior content remains recoverable for audit.
3. **Given** patient-visible plan elements per release rules, **When** the patient opens Care/Treatment areas, **Then** they see only released content in the approved UI.

---

### User Story 5 - Prescriptions, Medication History & Renewals (Priority: P1)

Doctors manage active prescriptions and medication history and renew eligible prescriptions; patients view active and historical medications under existing visibility rules.

**Why this priority**: Medication safety and continuity are core EMR and business goals.

**Independent Test**: Sign a prescription; view as patient; renew as doctor; confirm allergy warnings; confirm patient cannot renew.

**Acceptance Scenarios**:

1. **Given** an authorized doctor and patient context, **When** they create and sign a prescription, **Then** it appears in Active prescriptions (when not expired) and medication history, with audit of sign.
2. **Given** allergy or safety warnings, **When** the doctor reviews before sign, **Then** warnings are visible and signing requires explicit clinician acknowledgment when the design requires it.
3. **Given** an eligible prior prescription, **When** the doctor renews it, **Then** a new signed order is created and linked to the prior order; the prior signed content remains unchanged.
4. **Given** an authenticated patient, **When** they open Prescriptions, **Then** they can distinguish Active vs historical items and cannot create, edit, or renew prescriptions.

---

### User Story 6 - Laboratory, Imaging & Diagnostic Reports (Priority: P1)

Authorized users review laboratory results, medical imaging reports, and diagnostic reports with correct release labeling and critical-result handling.

**Why this priority**: Diagnostics drive clinical decisions and patient engagement.

**Independent Test**: Seed Preliminary/Final/Released/Retracted results; verify doctor vs patient visibility; verify critical banner for clinicians; verify timeline entries on release.

**Acceptance Scenarios**:

1. **Given** a doctor with care relationship, **When** they open Labs/Imaging/Reports, **Then** they can view Preliminary and Final items with status labels and mark-reviewed when Stitch provides it.
2. **Given** a result Released to patient, **When** the patient opens Lab Results, **Then** they see the released item with Preliminary/Final labeling as applicable.
3. **Given** a Retracted or Superseded result, **When** either role views current results, **Then** it does not appear as a current result (superseded notice only when designed).
4. **Given** a critical-flagged result, **When** a clinician opens the chart or results view, **Then** a prominent alert is shown; patient messaging remains non-alarmist with guidance to contact clinician/emergency services if severe.

---

### User Story 7 - Medical Documents & Consent Forms (Priority: P2)

Users manage referral letters, medical certificates, uploads, and consent forms with secure access, screening, and immutable signed artifacts.

**Why this priority**: Documents and consents are required for care coordination and compliance.

**Independent Test**: Upload allowed file; view referral; record consent; attempt overwrite of signed certificate and confirm blocked; confirm cross-user denial.

**Acceptance Scenarios**:

1. **Given** an authorized uploader (patient or clinician per design), **When** they upload a document of an allowed type/size, **Then** it is screened before availability and listed under Medical Documents when clean.
2. **Given** a referral letter or medical certificate issued/signed in-platform, **When** viewing after issue, **Then** content is immutable through normal edit paths.
3. **Given** a consent form presented to the patient, **When** the patient acknowledges consent, **Then** the system records who, when, and which consent version; withdrawal creates a new event without erasing the original acknowledgment record.
4. **Given** another patient, **When** they attempt access, **Then** access is denied and audited.

---

### User Story 8 - Longitudinal Medical Timeline (Priority: P1)

Authorized users browse a unified medical timeline spanning visits, appointments, clinical events, prescriptions, results, and key documents.

**Why this priority**: Longitudinal history is an explicit business goal and the EMR’s differentiating clinical narrative.

**Independent Test**: Seed mixed event types; filter timeline; open an event detail; confirm role filtering; confirm empty state.

**Acceptance Scenarios**:

1. **Given** an authorized patient or doctor, **When** they open Medical Timeline, **Then** they see chronological events they are allowed to view (encounters, appointments/visits, prescriptions, released results, key documents) in the approved Stitch layout.
2. **Given** timeline filters (e.g., visits, medications, labs) when present in design, **When** the user applies a filter, **Then** only matching allowed events remain.
3. **Given** an event, **When** the user opens it, **Then** they navigate to the corresponding detail surface without losing authorization checks.
4. **Given** no events yet, **When** timeline opens, **Then** an empty state explains that history appears as care occurs.

---

### User Story 9 - Administrator Clinical Oversight & Compliance Access (Priority: P2)

An administrator locates a patient chart for support/compliance, views permitted EMR sections under admin policy, and exports or places holds only when Stitch/ops controls allow—always with audit.

**Why this priority**: Shared RBAC includes Admin; oversight without routine clinical authorship protects safety and compliance.

**Independent Test**: Admin opens authorized chart view; attempt clinical sign of SOAP as admin and confirm denied; export audited if provided.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator, **When** they open an EMR oversight view for a patient per Stitch admin clinical screens, **Then** they can read permitted sections for support/compliance and the access is audited.
2. **Given** admin role, **When** they attempt to finalize/sign SOAP or prescriptions as a clinician, **Then** the action is denied (admins are not prescribing clinicians in v1).
3. **Given** an export or legal-hold control in design, **When** the administrator uses it, **Then** the action is attributable and audited; soft-hidden content remains in compliance retention.

---

### User Story 10 - Localized, Accessible EMR Surfaces (Priority: P1)

Patients, doctors, and admins complete primary EMR tasks in English or Arabic (RTL) with accessible interaction patterns.

**Why this priority**: Bilingual accessible care is a stated module requirement and market necessity.

**Independent Test**: Switch locale en↔ar on summary, timeline, and prescriptions; complete a primary task; keyboard-navigate critical alerts.

**Acceptance Scenarios**:

1. **Given** Arabic locale, **When** any primary EMR screen opens, **Then** layout is RTL and Arabic copy is used for UI chrome and system strings.
2. **Given** English locale, **When** the same screens open, **Then** LTR English copy is shown without layout breakage of critical controls.
3. **Given** keyboard-only use, **When** a user navigates summary alerts and primary actions, **Then** focus order is logical and controls are operable without a pointer.

---

### Edge Cases

- Patient and clinician-attested allergy conflict → both remain visible; clinician-attested takes clinical precedence for safety checks; conflict is visible to clinicians.
- Encounter completed with unsigned SOAP → visit can complete for throughput; unsigned notes remain pending until finalized or explicitly dismissed with reason (audited), consistent with Doctor Portal.
- Prescription renewal after expiry → allowed when clinician chooses renew-from-history; creates new order, does not revive the expired signed artifact in place.
- Lab released then retracted → removed from patient current list; timeline shows retraction/supersession notice when designed.
- Consent withdrawn → future care flows that require that consent version block until re-consent; historical acknowledgment retained.
- Doctor without care relationship → hard deny chart access (no break-glass in v1).
- Concurrent edits on draft SOAP → last explicit save wins with conflict detection/version token; user warned if overwrite risk detected.
- Malware/unsafe upload → fail-closed: not available in chart; user sees safe error.
- AI suggests documentation/Rx → never auto-signed; discarded suggestions leave no silent chart mutation.
- Admin viewing chart during patient soft-hide of an upload → admin/compliance view may still see hold copies when policy requires; patient default list hides item.
- Empty chart for new patient → summary and timeline show guided empty states, not errors.
- Large timeline history → paginated or windowed loading so primary viewport remains usable.
- Soft-deleted attachment still under legal hold → hidden from default lists; visible to admin/compliance; download still audited if opened.
- Concurrent draft saves with stale version token → save rejected or merged with warning; no silent clobber of newer draft.
- Diagnosis saved without ICD-10 code → allowed; appears as text-only on problem list/encounter; coding can be added later via amendment/update rules for unsigned problem-list entries.
- Consent required for telemedicine but withdrawn → gated telemedicine/care actions that declare that consent type fail closed until re-consent; historical ack remains.
- Timeline after lab retract → compensating/status event appears; prior release event remains historically explainable (not silently erased).
- Admin export of chart package → audited; respects legal hold; does not grant Admin prescribe/sign rights.
- Search with no matches inside own chart → empty state; search for another patient’s identifiers by a patient user → denial without confirming existence.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: EMR MUST provide a shared clinical record for each patient covering summary, history domains, clinical encounters, diagnoses, medications/prescriptions, laboratory/imaging/reports, medical documents, consents, and longitudinal timeline.
- **FR-002**: EMR UI surfaces MUST match approved Stitch designs as the visual source of truth and MUST NOT be redesigned.
- **FR-003**: Access to EMR data MUST enforce RBAC for Patient, Doctor, and Administrator roles plus care-relationship rules for clinician access to a given patient.
- **FR-004**: Patients MUST be able to view their own summary, medical history, allergies, chronic conditions, family history, immunizations, lifestyle, emergency information, released clinical documents/results, prescriptions, and timeline per release rules.
- **FR-005**: Patients MUST be able to update only Stitch-designated self-reported sections; clinician-attested and signed clinical content MUST remain read-only to patients.
- **FR-006**: Patient-reported clinical assertions MUST be labeled distinctly from clinician-attested entries.
- **FR-007**: Doctors with a care relationship MUST be able to view the full clinician chart needed for care (including preliminary diagnostics) and author clinical encounters, diagnoses, SOAP notes, doctor notes, treatment plans, care plans, and prescriptions.
- **FR-008**: SOAP notes and signed clinical summaries MUST support draft, finalize/sign, immutability after sign, and reason-coded amendments that create new versions.
- **FR-009**: Diagnoses MUST be associable to clinical encounters and visible on summary/timeline according to role rules.
- **FR-010**: Treatment Plans and Care Plans MUST support create/update with status and goals/interventions, with versioned history for clinically material changes.
- **FR-011**: Prescriptions MUST support active vs historical views, clinician create/review/sign, safety warning display (at least allergy-related), and doctor-initiated renewal linked to a prior order without mutating the prior signed order.
- **FR-012**: Patients MUST NOT create, edit, sign, or renew prescriptions in v1.
- **FR-013**: Laboratory results, medical imaging reports, and diagnostic reports MUST store status (e.g., Preliminary, Final, Released, Retracted/Superseded) and enforce role-based visibility accordingly.
- **FR-014**: Critical-flagged results MUST alert clinicians prominently; patient-facing copy MUST remain non-alarmist with guidance to seek clinician/emergency help if severe.
- **FR-015**: Medical Documents MUST support referral letters, medical certificates, uploads, and consent forms with authorization checks on list/view/download.
- **FR-016**: Uploaded documents MUST be safety-screened before chart availability (fail-closed) and MUST use private controlled download access (no permanent public links).
- **FR-017**: Signed clinical documents and certificates MUST be immutable through normal product edit paths.
- **FR-018**: Consent acknowledgment and withdrawal MUST be recorded with actor, timestamp, and consent content version; historical acknowledgments MUST NOT be erased by withdrawal.
- **FR-019**: EMR MUST present a unified Medical Timeline of authorized events including encounters, visits/appointments, prescriptions, diagnostics, and key documents, with optional filters when present in Stitch.
- **FR-020**: Visit History and Appointment History MUST be consistent with the Medical Timeline (same underlying events; no contradictory statuses).
- **FR-021**: Administrators MUST have audited read/oversight access to EMR for support and compliance as provided in Stitch admin clinical screens.
- **FR-022**: Administrators MUST NOT finalize/sign clinical SOAP notes or prescriptions as prescribing clinicians in v1.
- **FR-023**: All sensitive EMR views, downloads, exports, sign/finalize, amendments, renewals, consent events, and authorization denials MUST be attributable in the security audit trail.
- **FR-024**: Product UIs MUST NOT allow editing or deleting security audit entries.
- **FR-025**: Soft-delete or patient hide of documents MUST NOT purge compliance/audit history in v1.
- **FR-026**: EMR MUST expose authorized structured chart context to Platform AI assistants without allowing AI to sign, silently write finalized chart entries, or access unauthorized patients.
- **FR-027**: Emergency information and critical clinical alerts MUST be available at chart open for authorized clinicians.
- **FR-028**: Immunizations and chronic conditions MUST be capturable and viewable in the chart; clinician-attested immunization/condition entries follow clinician authorship rules.
- **FR-029**: EMR MUST support English and Arabic; Arabic MUST render with RTL on EMR surfaces; locale follows the user’s preference when authenticated.
- **FR-030**: EMR primary flows MUST be keyboard accessible, with visible focus and accessible names for critical alerts and primary actions.
- **FR-031**: Empty, loading, and error states for EMR lists and timelines MUST match Stitch patterns and MUST NOT expose other patients’ data on failure.
- **FR-032**: Cross-patient enumeration via EMR identifiers or error messages MUST be minimized (opaque identifiers; safe denial messaging).
- **FR-033**: Consuming portals MUST use EMR as the source of truth for chart domains listed in FR-001 rather than maintaining divergent clinical copies in v1.
- **FR-034**: High-impact clinical mutations (sign, amend, renew, release/retract diagnostics, consent withdraw) MUST fail clearly when validation or authorization fails, without partial silent corruption of signed artifacts.
- **FR-035**: Each Patient Chart MUST be uniquely bound to one patient identity (record ownership); authorship of entries MUST record whether the author is the patient (self-reported) or a clinician (clinician-attested), distinct from chart ownership.
- **FR-036**: EMR MUST enforce a role permission matrix on every list, detail, download, and mutation: Patient (self + released + self-reported writes); Doctor with care relationship (clinician chart + authorship); Doctor without relationship (deny); Administrator (oversight read/export/hold per design, no clinical sign/prescribe).
- **FR-037**: EMR MUST treat chart content as PHI: encrypted in transit and at rest, minimum-necessary UI and notifications, opaque identifiers in URLs, short-lived controlled downloads (no permanent public links), and session-end clearing of interactive client PHI under app control.
- **FR-038**: Chart access MUST be purpose-limited to care, patient self-management, or admin support/compliance; deep links MUST re-authorize; EMR MUST NOT feed chart PHI into marketing analytics in v1.
- **FR-039**: Signed/finalized clinical artifacts MUST be immutable; amendments and renewals MUST create new versions/orders linked to priors with actor, timestamp, and reason when amending; drafts MUST use concurrency tokens to prevent silent overwrite.
- **FR-040**: EMR MUST emit append-only security audit events for sensitive views, downloads, clinical mutations, soft-delete/hide/restore, consent lifecycle, admin export/hold, and authz denials; product UIs MUST NOT edit/delete those events; audit retention MUST be ≥6 years.
- **FR-041**: Product removal of chart items MUST be soft-delete/hide only; hard delete of PHI-bearing chart history from product UI is forbidden in v1; soft-deleted items remain available to compliance/admin under policy and retain version/audit linkage.
- **FR-042**: Chart attachments MUST be classified, size/type-limited, malware-screened fail-closed, authorized like their parent item, download-audited, and immutable when attached to signed artifacts (replacements only via new versions).
- **FR-043**: Medical Timeline MUST be a role-filtered projection of authoritative events with stable ordering; corrections MUST add compensating/status events rather than silently rewriting history; appointment/visit facets MUST not contradict scheduling module states.
- **FR-044**: Clinical chart retention MUST default to ≥6 years from last clinically material update (or longer under legal hold); operational non-PHI diagnostics follow ≥30-day online floor; account closure MUST NOT hard-wipe retained/held chart PHI via product UI.
- **FR-045**: Consent records MUST be typed and bound to versioned consent text; acknowledgment and withdrawal MUST be append-only events; care flows that require a consent type MUST fail closed after withdrawal until re-consent.
- **FR-046**: Diagnoses MUST support optional ICD-10 (or ICD-10-CM) codes with display text; text-only diagnoses remain allowed in v1; when Stitch includes a code picker, catalog search MUST be available without blocking free-text fallback.
- **FR-047**: EMR MUST keep clinical entities structured for future external interoperability mapping (patient, encounter, condition, allergy, medication request, observation/result, document reference, consent) without requiring a live HL7/FHIR federation server in v1; optional audited chart export may be provided when Stitch includes it.
- **FR-048**: Authorized in-chart search/filter MUST support text, status, type, and date-range controls where Stitch provides them, with RBAC/release enforcement identical to browse; cross-patient clinical search is limited to Administrator (and Doctor panel limited to care-relationship patients); default list page size is 20.

### Key Entities

- **Patient Chart**: The longitudinal clinical record bound to one patient identity.
- **Patient Summary**: Snapshot view of key chart elements and alerts for rapid orientation.
- **Allergy**: Patient-reported and/or clinician-attested allergy with severity/criticality when known.
- **Chronic Condition**: Long-term condition entry with attestation source and status.
- **Family History / Lifestyle / Emergency Information**: Structured non-encounter profile domains; emergency info includes contacts and critical flags.
- **Immunization**: Vaccination record with date/status and attestation source.
- **Clinical Encounter**: Care visit/event container linking diagnoses, notes, and plans.
- **Diagnosis**: Coded or named assessment associated with an encounter and/or problem list.
- **SOAP Note / Doctor Note / Clinical Summary**: Encounter documentation artifacts with draft/signed lifecycle.
- **Treatment Plan / Care Plan**: Longitudinal plan with goals, interventions, and status.
- **Prescription / Medication Order**: Signed medication order; renewals create linked new orders; history retains prior orders.
- **Diagnostic Result**: Lab, imaging, or diagnostic report package with release/status lifecycle.
- **Medical Document**: Referral, certificate, upload, or other chart file with classification and access rules.
- **Consent Record**: Acknowledgment or withdrawal event tied to a consent text version.
- **Medical Timeline Event**: Chronological projection of chart/care events for a role’s visibility.
- **Clinical Version**: Immutable snapshot of a signed artifact with link to prior version and amendment metadata.
- **Chart Attachment**: Classified file linked to a chart item, with scan status and access rules.
- **Legal Hold**: Custody flag that prevents destructive purge of retained chart materials pending investigation/compliance.
- **Consent Type / Consent Text Version**: Cataloged consent category and immutable wording revision used at acknowledgment time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authorized patients can open their EMR summary and locate allergies, active medications, and timeline within 1 minute in moderated usability tests.
- **SC-002**: Authorized doctors can open a care-relationship chart and see allergy/critical alerts before prescribing in 100% of scripted safety tests.
- **SC-003**: 100% of automated authorization tests deny cross-patient chart access for patients and deny chart access for doctors without care relationship.
- **SC-004**: 100% of finalize/sign tests leave prior signed SOAP/prescription/certificate content unchanged when amendments or renewals occur (new version/order only).
- **SC-005**: In side-by-side checks, patient-visible labs match Released-to-patient membership; doctors still see Preliminary/Final for the same patient when authorized.
- **SC-006**: Doctor-initiated prescription renewal produces a new active/historical order linked to the prior order in 100% of renewal tests; patients cannot renew.
- **SC-007**: Medical Timeline shows encounter, prescription, and released lab events in chronological order for seeded charts in 100% of timeline verification runs.
- **SC-008**: Sensitive chart view, download, sign, amend, renew, and denial events appear in administrator-visible audit in ≥99% of successful test executions.
- **SC-009**: Users can switch EMR UI between English and Arabic and complete one primary task (view summary or open a timeline event) in under 2 minutes without critical control breakage.
- **SC-010**: Keyboard-only users can reach and operate the primary allergy/critical alert and one primary navigation action on the summary in accessibility checks.
- **SC-011**: Stitch-covered EMR screens match approved designs for primary viewport states in visual QA (no redesign deltas accepted as improvements).
- **SC-012**: AI suggestion flows never produce a signed clinical artifact without an explicit clinician sign act in 100% of AI safety tests.
- **SC-013**: Administrators can open an oversight chart view when permitted, and 100% of attempts to sign SOAP/prescriptions as admin are denied.
- **SC-014**: Consent withdrawal leaves the original acknowledgment record queryable for compliance in 100% of consent lifecycle tests.
- **SC-015**: Malware/rejected uploads never appear as available chart documents in 100% of fail-closed upload tests.
- **SC-016**: Soft-delete/hide removes an item from default patient lists while remaining recoverable under admin/compliance policy in 100% of soft-delete tests; hard-delete controls are absent from product UI.
- **SC-017**: In-chart search never returns another patient’s PHI for a Patient actor in 100% of cross-patient search abuse tests.
- **SC-018**: Timeline corrections (retract/amend/hide) leave a explainable history (compensating or status-marked events) in 100% of integrity tests—no silent erasure of prior events.
- **SC-019**: Diagnoses round-trip with optional ICD-10 code + display text when coded, and remain valid when text-only, in 100% of diagnosis save tests.
- **SC-020**: Audited chart export (when enabled in design) records actor/target/outcome and does not grant Admin clinical sign rights in 100% of export tests.

## Assumptions

- Authentication, sessions, and base RBAC are provided by the Auth module; EMR specializes clinical authorization (care relationship, release rules).
- Patient, Doctor, and Admin portal shells host EMR screens; EMR does not ship a separate login portal.
- Platform Services provide shared notifications, file storage/document screening, audit primitives, localization catalogs, and AI boundary used by EMR.
- Care relationship for doctors includes assigned/treating appointment, recent schedule window, or panel assignment consistent with Doctor Portal rules.
- SAR-market clinical practice assumptions: bilingual en/ar; Gregorian dates sufficient unless Stitch shows Hijri; no national e-Rx network certification claimed in v1.
- Coding systems for diagnoses/meds may start with pragmatic catalogs suitable for telemedicine; full national formulary certification is not required to ship v1 documentation/prescribing UX.
- “HIPAA-ready” means architectural controls (authz, audit, encryption in transit/at rest via platform, minimum necessary UI)—not a completed external certification.
- Stitch MCP designs for EMR are approved and will be exported/referenced during planning; pixel implementation follows those screens.
- Appointment booking/cancellation UX remains owned by Patient/Doctor portals; EMR timeline reflects appointment/visit facts those modules record.
- Video consultation media is not stored in EMR notes by default; visit linkage may appear on timeline when a telemedicine encounter exists.
- Break-glass emergency access without care relationship is out of v1.
- Patient-initiated refill requests remain out of v1; renewals are clinician-initiated.
- Ordering new laboratory/imaging studies is out of v1 unless explicitly present in Stitch; EMR focuses on resulting/report management.
- DICOM advanced viewing/PACS tooling is out of v1; imaging is report-and-attachment centric per Stitch.
- Admin clinical authorship (acting as attending) is out of v1.
- Chart ownership = patient identity; Hakeem retains custody under retention/legal hold; clinicians have access rights, not ownership.
- Care-relationship definition remains consistent with Doctor Portal (assigned appointment, schedule window, or panel).
- Soft-delete/hide is the only product removal path; infrastructure-level destruction after retention expiry is ops/legal runbook, not an end-user control.
- Attachment limits and screening reuse Platform Services defaults (including ~25 MB ceiling unless tightened).
- Security audit retention ≥6 years for EMR clinical access/mutation events; clinical chart retention ≥6 years default subject to legal hold.
- ICD-10 readiness means optional coding fields + catalog search when designed—not certified coding completeness or automated coder replacement.
- HL7/FHIR compatibility means structured export-friendly clinical model and optional package export—not live ADT feeds or a certified FHIR server in v1.
- Proxy/guardian consent and pediatric custody workflows are out of v1 unless Stitch explicitly includes them.
- Duplicate-patient chart merge is out of v1.
- Cross-patient clinical discovery search is not available to Patient role.

## Scope Boundaries

### In Scope

- Shared EMR chart domains listed in the feature input (summary through timeline).
- Role-appropriate view/author behaviors for Patient, Doctor, Administrator.
- Longitudinal timeline and consistency of visit/appointment history facets.
- Doctor-initiated prescription renewals; consent capture/withdrawal records.
- Stitch-faithful UI; en/ar + RTL; accessibility for primary flows.
- Auditability and immutability rules for signed clinical artifacts.
- AI context exposure with non-signing safeguards.

### Out of Scope (v1)

- Separate EMR-only portal shell or anonymous public chart access.
- Break-glass access, Admin-as-prescriber, patient refill requests.
- Live HL7v2 ADT/FHIR server federation, certified e-prescribing networks, full PACS/DICOM workstations.
- Redesigning Stitch screens or inventing parallel clinical UX.
- Hard-delete of PHI-bearing chart history from product UI.
- Marketing analytics that ingest clinical chart contents.
- Proxy/guardian consent and duplicate-patient chart merge.
- National coding certification or AI auto-coding authority claims.
