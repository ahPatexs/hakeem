# Feature Specification: AI Healthcare Platform

**Feature Branch**: `008-ai-healthcare-platform`

**Created**: 2026-08-04

**Status**: Draft

**Input**: User description: "Module 7: AI Healthcare Platform — intelligent healthcare assistance across the entire Hakeem ecosystem. AI-powered conversations, clinical documentation, medical recommendations, prescription assistance, and operational analytics. Serves Patients, Doctors, and Administrators. UI already designed and approved using Stitch MCP — do not redesign; Stitch is the single source of truth. Patient AI: AI Medical Assistant, Symptom Checker, Health Q&A, Health Education, Conversation History, Personalized Recommendations. Doctor AI: AI Clinical Documentation, AI SOAP Notes, AI Consultation Summary, AI Prescription Assistant, Clinical Decision Support. Administration AI: AI Operations Dashboard, AI Usage Analytics, Prompt Management, AI Monitoring, Cost Monitoring, Model Management. Business goals: reduce clinical workload, improve patient engagement, accelerate documentation, assist clinical decision making, improve healthcare accessibility, provide explainable AI responses. Must support English, Arabic, RTL, and accessibility."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Patient Converses with the AI Medical Assistant (Priority: P1)

An authenticated patient opens the AI Medical Assistant and holds a conversation in English or Arabic: asks health questions (Health Q&A), gets educational answers grounded in safe, general medical knowledge and — where authorized — their own chart context. Every conversation is saved to a browsable Conversation History the patient can reopen, continue, or delete from their view. The assistant always presents itself as an AI, shows a medical disclaimer, and escalates to human care guidance when the topic exceeds safe self-care scope.

**Why this priority**: The patient assistant is the flagship engagement surface of the module and the foundation (conversation, history, safety, language) every other patient AI feature builds on.

**Independent Test**: Log in as a patient, start a conversation in English and another in Arabic, receive coherent grounded answers with a visible AI/medical disclaimer, find both conversations in history, reopen and continue one, and confirm an out-of-scope request (e.g., "prescribe me antibiotics") is refused with guidance to consult a doctor.

**Acceptance Scenarios**:

1. **Given** an authenticated patient, **When** they open the AI Medical Assistant and send a health question, **Then** they receive a relevant, plain-language answer in their chosen locale with the AI identity and medical disclaimer visible per the approved Stitch design.
2. **Given** a patient with prior conversations, **When** they open Conversation History, **Then** they see their own conversations only, ordered most-recent first, and can reopen and continue any of them with prior context preserved.
3. **Given** a patient asks the assistant to diagnose a condition or prescribe medication, **When** the assistant responds, **Then** it declines to diagnose or prescribe, explains its assistive role, and directs the patient to book a consultation or seek care.
4. **Given** a patient writes in Arabic, **When** the assistant responds, **Then** the response is in Arabic with correct RTL rendering, and safety messaging is equivalent in meaning to the English version.
5. **Given** a patient describes symptoms indicating a possible emergency (e.g., chest pain with shortness of breath), **When** the assistant detects the red-flag pattern, **Then** it immediately and prominently advises contacting emergency services before any other content.

---

### User Story 2 - Doctor Generates AI Clinical Documentation (Priority: P1)

During or after a consultation, a doctor asks the AI to draft clinical documentation: a structured SOAP note and/or a patient-friendly consultation summary, generated from the encounter context (appointment, chart data the doctor is authorized to see, and the doctor's own dictated or typed inputs). The AI output is always a **draft** clearly labeled as AI-assisted; the doctor reviews, edits, and remains the sole authority to finalize/sign. Nothing AI-generated enters the medical record without explicit clinician acceptance.

**Why this priority**: Documentation acceleration is the core clinical-workload business goal, and it composes directly with the existing EMR signing/versioning rules.

**Independent Test**: As a doctor with an in-progress consultation, request an AI SOAP draft, verify the draft populates the SOAP fields marked as AI-assisted, edit one field, sign it as usual, and confirm the signed note records that AI assistance was used. Confirm the AI can never sign or finalize on its own.

**Acceptance Scenarios**:

1. **Given** a doctor in an active consultation workspace, **When** they request AI documentation help, **Then** a draft SOAP note (subjective/objective/assessment/plan) is generated from the authorized encounter context and clearly labeled as an AI draft pending clinician review.
2. **Given** an AI-generated draft, **When** the doctor edits and signs it, **Then** the signed artifact follows existing EMR immutability/versioning rules and permanently records that AI assistance was used.
3. **Given** a completed consultation, **When** the doctor requests an AI consultation summary for the patient, **Then** a plain-language draft summary is produced in the patient's locale for the doctor to review and finalize before the patient can see it.
4. **Given** the AI service is unavailable, **When** a doctor requests documentation help, **Then** the manual documentation flow remains fully usable and the failure is communicated without blocking clinical work.
5. **Given** any AI draft, **When** no clinician has accepted it, **Then** it is never visible to the patient and never becomes part of the signed medical record.

---

### User Story 3 - Patient Uses the Symptom Checker (Priority: P2)

A patient starts a guided symptom-check session: describes symptoms (free text and/or structured follow-up questions), answers clarifying questions, and receives a non-diagnostic triage-style outcome — self-care guidance, recommendation to book a consultation, or urgent-care/emergency advice — with a clear explanation of why. Sessions are saved and the patient can share a session summary with a doctor when booking.

**Why this priority**: The symptom checker is a distinct high-value engagement flow, but it depends on the conversational and safety foundation of Story 1.

**Independent Test**: As a patient, complete a symptom-check session for a mild complaint and receive self-care guidance; complete one with red-flag symptoms and receive an emergency escalation; verify both sessions appear in history and that no session ever outputs a definitive diagnosis.

**Acceptance Scenarios**:

1. **Given** a patient starts a symptom-check session, **When** they describe symptoms, **Then** the system asks relevant clarifying questions and produces a guidance outcome (self-care / see a doctor / urgent) with a plain-language rationale — never a definitive diagnosis.
2. **Given** red-flag symptoms are reported at any point, **When** the system detects them, **Then** the session immediately surfaces emergency guidance ahead of all other content.
3. **Given** a completed session, **When** the patient chooses to book a consultation, **Then** they can attach the session summary so the doctor sees the pre-visit context.
4. **Given** any symptom-check outcome, **When** it is displayed, **Then** it includes the disclaimer that it is not a medical diagnosis and does not replace professional care.

---

### User Story 4 - Doctor Uses Prescription Assistance & Clinical Decision Support (Priority: P2)

While prescribing or reviewing a chart, a doctor receives AI-powered assistance: suggested medication details for a stated intent, and decision-support signals such as allergy conflicts, potential drug-drug interactions, and relevant chart context (conditions, active medications). Every suggestion is explainable — it states what chart evidence it used — and the doctor remains fully responsible for the final prescription, which follows the existing prescription safety-check and signing flow.

**Why this priority**: Highest clinical-risk surface; must build on the signed-prescription and safety-check rules already in the EMR module.

**Independent Test**: As a doctor drafting a prescription for a patient with a documented penicillin allergy, ask the assistant for an antibiotic suggestion and verify the allergy conflict is flagged with the chart evidence cited; accept a suggestion into the draft and verify the normal sign flow (including existing safety acknowledgment) still applies.

**Acceptance Scenarios**:

1. **Given** a doctor drafting a prescription, **When** they request AI assistance, **Then** suggestions are drafts only, cite the chart evidence used (e.g., documented allergies, active meds), and populate the draft only on explicit doctor acceptance.
2. **Given** a patient's chart documents an allergy or an active medication that conflicts with a suggestion, **When** the suggestion is shown, **Then** the conflict is flagged prominently before acceptance, and the existing prescription safety-check/acknowledgment at signing remains in force.
3. **Given** a doctor reviews a chart, **When** clinical decision support surfaces insights (e.g., overdue follow-up, relevant history), **Then** each insight states its source data and confidence framing, and can be dismissed without altering the chart.
4. **Given** the AI is uncertain or lacks data, **When** it cannot make a safe suggestion, **Then** it says so explicitly rather than fabricating a recommendation.

---

### User Story 5 - Administrator Operates the AI Platform (Priority: P2)

An administrator opens the AI Operations Dashboard to see platform-wide AI health at a glance: usage volumes by feature and role, response quality signals (user feedback, refusal/guardrail rates), error rates and latency, and cost tracking against configured budgets. The admin can drill into usage analytics by period, feature, and locale, and receives alerts when cost or error thresholds are breached.

**Why this priority**: Required to run the AI platform responsibly and control spend, but depends on the patient/doctor features existing to produce data.

**Independent Test**: As an admin, open the dashboard and verify usage, cost, error, and guardrail metrics render for a selected period; set a monthly cost budget, simulate exceeding the threshold, and verify an alert is raised; verify a non-admin cannot access any operations surface.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** they open the AI Operations Dashboard, **Then** they see aggregate usage, cost, latency/error, and guardrail metrics for the selected period per the approved Stitch design — with no patient message content exposed.
2. **Given** a configured cost budget, **When** consumption crosses the alert threshold, **Then** administrators are notified and the dashboard prominently shows the breach.
3. **Given** usage analytics, **When** an admin filters by feature, role, or locale, **Then** figures update consistently and totals reconcile across views.
4. **Given** a non-admin user, **When** they attempt to access AI operations surfaces, **Then** access is denied and the denial is audited.

---

### User Story 6 - Administrator Manages Prompts and Models (Priority: P3)

An administrator manages the AI configuration that shapes system behavior: versioned prompt templates per feature (with draft → publish lifecycle and rollback), and model management (which model serves which feature, with parameters and fallbacks). Changes are versioned, audited, and take effect without code changes; a bad change can be rolled back to the previous published version.

**Why this priority**: Operational maturity feature; the platform can launch with seeded defaults and add this control surface after core flows work.

**Independent Test**: As an admin, edit a prompt template as a draft, publish it, verify new conversations use the new version, then roll back and verify the previous version is restored; reassign a feature to a different model configuration and verify the assignment is versioned and audited.

**Acceptance Scenarios**:

1. **Given** an admin edits a prompt template, **When** the edit is saved as a draft, **Then** live traffic continues using the last published version until the draft is explicitly published.
2. **Given** a published prompt version misbehaves, **When** the admin rolls back, **Then** the previous published version is restored and the change is audited with actor, timestamp, and reason.
3. **Given** model management, **When** an admin changes the model assignment or parameters for a feature, **Then** the change is versioned and audited, and a fallback behavior is defined for when the primary model is unavailable.
4. **Given** every AI response, **When** it is logged for operations, **Then** it records which prompt version and model configuration produced it, so behavior is traceable.

---

### User Story 7 - Patient Receives Health Education & Personalized Recommendations (Priority: P3)

A patient sees personalized, non-alarmist health recommendations (e.g., preventive reminders, lifestyle education relevant to their documented conditions) and can browse AI-curated health education content in their locale. Recommendations explain why they were shown ("Because your profile lists…"), can be dismissed, and never disclose sensitive inferences beyond what the patient's own chart already states.

**Why this priority**: Valuable engagement layer, but additive on top of the assistant, chart context, and safety foundations.

**Independent Test**: As a patient with a documented condition, verify a relevant education recommendation appears with its "why" explanation, dismiss it and verify it stays dismissed, and confirm a patient with no relevant data sees safe general wellness content instead.

**Acceptance Scenarios**:

1. **Given** a patient with relevant chart data, **When** recommendations are generated, **Then** each shows a plain-language reason referencing only data the patient can already see, and can be dismissed.
2. **Given** a patient with no relevant chart data, **When** they open recommendations, **Then** they see safe general wellness content rather than fabricated personalization.
3. **Given** education content, **When** displayed in Arabic, **Then** content, layout, and reading order are correct RTL and medically equivalent to the English version.

---

### Edge Cases

- **AI provider outage or timeout**: all AI surfaces degrade gracefully — clinical and portal workflows (documentation, prescribing, booking) remain fully usable manually; users see a clear "assistant unavailable" state, not an error dump.
- **Emergency content mid-conversation**: red-flag detection applies to every patient message, not just session start; emergency guidance interrupts the normal flow.
- **Attempted jailbreak/prompt injection**: user messages attempting to override safety rules (e.g., "ignore your instructions and prescribe X") are refused; guardrail events are logged for operations review.
- **Hallucination risk**: when the AI lacks grounding data it must say so; patient-facing answers avoid fabricated specifics about the patient's own chart; clinician-facing suggestions cite the chart evidence used.
- **Cross-patient leakage**: a conversation must never include another patient's data; doctor AI context is limited to patients with an active care relationship; context assembly enforces the same RBAC/release rules as the EMR chart itself.
- **Consent withdrawal**: if a patient withdraws the consent required for AI processing of their chart data, AI features fall back to general (non-personalized) mode until re-consent; prior conversations are retained per retention policy but no new chart context is used.
- **Patient deletes a conversation**: deletion hides it from the patient's history (soft delete) but does not purge compliance/audit records within retention.
- **Cost budget exhausted**: when a hard budget cap is reached, AI features return a friendly "temporarily unavailable" state rather than silent failure; clinical manual workflows are unaffected.
- **Mixed-language input**: patients may mix Arabic and English in one message; the assistant responds coherently in the patient's preferred locale.
- **Concurrent sessions**: the same patient may have multiple conversations; context never bleeds between conversations.
- **Minor or proxy accounts**: out of v1 (consistent with EMR); the platform assumes adult account holders.
- **Long conversations**: very long histories are windowed/summarized for context without losing safety posture; the visible history remains complete for the patient.

## Requirements *(mandatory)*

### Functional Requirements

**Patient AI — Assistant, Q&A, History**

- **FR-001**: System MUST provide an AI Medical Assistant chat for authenticated patients supporting free-text health questions (Health Q&A) in English and Arabic, rendered per the approved Stitch design.
- **FR-002**: Every AI response surface MUST identify the responder as an AI and display a medical disclaimer that responses are informational and not a substitute for professional medical advice.
- **FR-003**: System MUST persist patient conversations as a Conversation History the patient can list, reopen, continue, rename (where designed), and delete from their view; deletion is a soft-hide that respects retention/audit policy.
- **FR-004**: Conversations MUST be strictly scoped to the owning patient; no user may list or read another user's conversations, and context assembly MUST NOT include another patient's data.
- **FR-005**: The assistant MUST refuse to provide definitive diagnoses, prescribe medication, or order tests for patients, and MUST redirect such requests to booking a consultation or seeking care.
- **FR-006**: The assistant MUST detect emergency red-flag content in any patient message and immediately present emergency-care guidance ahead of all other content.
- **FR-007**: When authorized (see FR-031), the assistant MAY ground answers in the patient's own chart context (allergies, conditions, medications, recent results released to the patient); it MUST NOT reference chart data the patient cannot already see in their portal.
- **FR-008**: The assistant MUST state uncertainty explicitly when it lacks sufficient grounding rather than fabricating patient-specific claims.

**Patient AI — Symptom Checker**

- **FR-009**: System MUST provide a guided symptom-check session flow: symptom intake (free text and structured follow-ups), clarifying questions, and a non-diagnostic guidance outcome (self-care / book consultation / urgent or emergency care) with a plain-language rationale.
- **FR-010**: Symptom-check outcomes MUST never be presented as a diagnosis and MUST carry the non-diagnostic disclaimer.
- **FR-011**: Red-flag symptom patterns MUST trigger immediate emergency guidance at any point in the session.
- **FR-012**: Completed symptom-check sessions MUST be saved to the patient's history, and the patient MUST be able to attach a session summary to a consultation booking so the treating doctor can view the pre-visit context.

**Patient AI — Education & Recommendations**

- **FR-013**: System MUST present personalized health recommendations and education content to patients where designed, each with a plain-language explanation of why it was shown, referencing only data the patient can already see.
- **FR-014**: Patients MUST be able to dismiss recommendations, and dismissals MUST persist.
- **FR-015**: When no relevant personal data exists (or personalization consent is absent), the system MUST show safe general wellness content instead of fabricated personalization.

**Doctor AI — Clinical Documentation**

- **FR-016**: System MUST let a doctor request AI-drafted clinical documentation for an encounter they are authorized on: a structured SOAP draft and/or an AI Consultation Summary draft, generated from the authorized encounter/chart context plus the doctor's own inputs.
- **FR-017**: All AI-generated clinical content MUST be clearly labeled as AI-assisted draft, MUST require explicit clinician review and acceptance before entering any record, and MUST be impossible for the AI to finalize/sign autonomously.
- **FR-018**: Signed artifacts that incorporated AI assistance MUST permanently record that AI assistance was used (aligned with the existing EMR AI-assisted flag and signing/immutability rules).
- **FR-019**: AI consultation summaries intended for patients MUST be generated in the patient's locale and MUST NOT be visible to the patient until the doctor finalizes them under existing release rules.

**Doctor AI — Prescription Assistant & Clinical Decision Support**

- **FR-020**: System MUST provide prescription-drafting assistance to doctors: suggested medication details for a stated clinical intent, presented as drafts that populate the prescription only on explicit doctor acceptance.
- **FR-021**: Prescription suggestions MUST be checked against the patient's documented allergies and active medications; detected conflicts MUST be flagged prominently before acceptance, and the existing prescription safety-check/acknowledgment at signing remains mandatory and unchanged.
- **FR-022**: Clinical decision support insights (e.g., relevant history, potential interactions, care gaps) MUST each cite the chart evidence used, be dismissible, and never mutate the chart on their own.
- **FR-023**: Doctor AI context MUST be limited to patients with an active care relationship, enforcing the same access rules as the EMR chart; no care relationship → no AI context.

**Explainability & Safety (cross-cutting)**

- **FR-024**: AI responses that use patient-specific data MUST be explainable: the user can see what categories of their data informed the response (e.g., "based on your documented allergies and current medications").
- **FR-025**: System MUST maintain guardrails against prompt injection and instruction override; refused/guarded interactions MUST be logged as guardrail events for operations review without storing more content than policy allows.
- **FR-026**: Users MUST be able to rate or flag AI responses (helpful/not helpful, report a problem) where the Stitch design provides feedback controls; feedback feeds operations analytics.
- **FR-027**: All AI features MUST degrade gracefully: when the AI service is unavailable or budgets are exhausted, manual workflows remain fully usable and users see a clear, friendly unavailable state.

**Privacy, Consent, RBAC, Audit**

- **FR-028**: AI conversation content and AI-processed chart context are PHI-sensitive: encrypted in transit and at rest via platform capabilities, excluded from notification/email bodies beyond minimal "you have a response" copy, and never exposed through operations dashboards as raw message content.
- **FR-029**: Role-based access MUST be enforced on every AI capability: patient AI features for patients on their own data; doctor AI features only within care relationships; administration AI surfaces for administrators only. Denials are audited.
- **FR-030**: Patient chart data MUST NOT be used to personalize AI features without the applicable data-use consent; withdrawal switches AI features to general non-personalized mode until re-consent (consistent with EMR consent gating).
- **FR-031**: AI use of chart context MUST respect the same release rules as the portal: patient-facing AI sees only patient-released data; doctor-facing AI sees the clinician-grade chart for authorized patients.
- **FR-032**: System MUST audit AI-significant events append-only: conversation created/deleted, chart-context access by the AI on a user's behalf, clinician acceptance of AI drafts, guardrail triggers, admin prompt/model/budget changes, and authorization denials — each with actor, action, target, outcome, timestamp.
- **FR-033**: AI interaction records MUST follow platform retention rules (clinical-linked artifacts follow EMR retention; operational logs follow ops retention); patient-initiated deletion is soft-hide within retention.

**Administration AI — Operations, Analytics, Cost**

- **FR-034**: System MUST provide an AI Operations Dashboard for administrators showing, for a selectable period: usage volume by feature/role/locale, latency and error rates, guardrail/refusal rates, user feedback signals, and cost — per the approved Stitch design.
- **FR-035**: System MUST meter AI usage per interaction (feature, role, model, token/request volume as applicable) and attribute cost so totals reconcile across dashboard views.
- **FR-036**: Administrators MUST be able to configure cost budgets with alert thresholds and a hard-cap behavior; threshold breaches notify administrators, and hard-cap exhaustion triggers the graceful-unavailable state (FR-027).
- **FR-037**: AI monitoring MUST expose service health (availability, error spikes, unusual guardrail activity) so administrators can detect incidents without reading user content.

**Administration AI — Prompt & Model Management**

- **FR-038**: System MUST support versioned prompt templates per AI feature with a draft → publish lifecycle: live traffic uses only published versions; publishing and rollback are admin actions, versioned and audited with actor, timestamp, and reason.
- **FR-039**: System MUST support model management: administrators can view and change which model configuration (model choice and key parameters) serves each AI feature, with defined fallback behavior when a primary model is unavailable; changes are versioned and audited.
- **FR-040**: Every AI response MUST be traceable to the prompt version and model configuration that produced it.

**Localization & Accessibility**

- **FR-041**: All AI surfaces MUST support English and Arabic with full RTL for Arabic, including AI-generated content direction, per the approved Stitch design; safety and disclaimer messaging MUST be equivalent in meaning across locales.
- **FR-042**: AI surfaces MUST meet the platform accessibility bar: keyboard-operable chat and controls, visible focus, meaningful labels/roles for assistive technology, streaming/data updates announced accessibly, and sufficient contrast per the approved design.
- **FR-043**: Mixed-language patient input MUST be handled gracefully, responding in the patient's preferred locale.

**Integration with the Hakeem ecosystem**

- **FR-044**: The module MUST consume existing platform capabilities rather than duplicating them: authentication/RBAC from the auth module, chart data via the EMR module's authorized access paths, consent state from EMR consent management, and notifications via platform services.
- **FR-045**: AI MUST NOT write to the medical record autonomously: all chart mutations continue to flow exclusively through the existing clinician-controlled EMR flows.

### Key Entities

- **AIConversation**: A patient's (or doctor's, where designed) chat session with the assistant — owner, feature type, locale, title, status (active/hidden), created/updated timestamps.
- **AIMessage**: One turn within a conversation — role (user/assistant/system-notice), content, locale/direction, safety annotations (disclaimer shown, red-flag triggered), and traceability (prompt version, model configuration) for assistant turns.
- **SymptomCheckSession**: A guided symptom-check instance — reported symptoms, clarifying Q&A, guidance outcome (self-care/consult/urgent), rationale, red-flag status, link to a booking when attached.
- **AIRecommendation**: A personalized recommendation/education item shown to a patient — subject, plain-language reason, source data categories, dismissal state.
- **AIDraftArtifact**: An AI-generated clinical draft (SOAP draft, consultation summary draft, prescription suggestion) — encounter/patient linkage, generating context summary, review status (pending/accepted/discarded), accepting clinician, and the resulting EMR artifact reference once accepted.
- **PromptTemplate / PromptVersion**: Feature-scoped prompt configuration — template identity, versioned content, status (draft/published/archived), publisher, timestamps, rollback lineage.
- **AIModelConfiguration**: Assignment of a model and parameters to an AI feature — model identity, parameters, fallback behavior, version history.
- **AIUsageEvent**: Metering record per AI interaction — feature, role, locale, model, volume measures, latency, outcome (success/error/refused), cost attribution. Contains no message content.
- **AICostBudget**: Admin-configured budget — scope, period, amount, alert threshold, hard-cap behavior, breach state.
- **AIGuardrailEvent**: Record of a safety intervention — trigger type (red-flag, refusal, injection attempt), feature, timestamp, minimal necessary context per policy.
- **AIFeedback**: User rating/flag on an AI response — conversation/message reference, rating, optional category, timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A patient can start an AI conversation and receive a first useful response in under 10 seconds in the common case; 95% of assistant responses begin rendering within 15 seconds.
- **SC-002**: 100% of patient-facing AI responses display the AI identity and medical disclaimer; 0 instances of the assistant issuing a definitive diagnosis or prescription to a patient in acceptance testing.
- **SC-003**: 100% of tested red-flag symptom inputs produce emergency guidance as the first visible content.
- **SC-004**: Doctors using AI documentation produce a reviewed, signed SOAP note at least 30% faster than the manual baseline for comparable encounters.
- **SC-005**: 100% of AI-assisted signed artifacts record AI involvement; 0 AI-originated chart mutations without clinician acceptance in testing.
- **SC-006**: 100% of prescription suggestions for patients with documented conflicting allergies/medications display the conflict before acceptance.
- **SC-007**: Cross-role access tests pass 100%: no patient can access another's conversations, no doctor gets AI context without a care relationship, no non-admin reaches operations surfaces.
- **SC-008**: Administrators can determine current-period AI spend and usage by feature within 1 minute of opening the dashboard; cost totals reconcile across analytics views with 0 discrepancy.
- **SC-009**: A prompt rollback restores prior published behavior for new interactions within 1 minute, with a complete audit trail.
- **SC-010**: When the AI provider is unavailable, 100% of core manual workflows (documentation, prescribing, booking, chart review) remain fully usable.
- **SC-011**: Arabic/RTL parity: 100% of AI surfaces render correctly in Arabic RTL, and en/ar message catalogs remain in parity per the existing i18n checks.
- **SC-012**: Primary AI flows (patient chat, symptom check, doctor documentation review) are fully keyboard-operable and screen-reader navigable in acceptance testing.

## Assumptions

- **Scope of the module**: Module 7 is the AI capability layer across existing Hakeem portals — it does not introduce a new portal shell. Patient AI lives in the patient portal, doctor AI in the doctor portal/consultation workspace, and administration AI in the admin portal, all on approved Stitch surfaces.
- **Stitch is the design source of truth**: no UI redesign; where a feature in this spec has no corresponding approved Stitch surface, the UI portion waits for design export while the underlying capability may still be built.
- **Human-in-the-loop is absolute for clinical content**: AI never signs, finalizes, prescribes, releases results, or writes to the chart autonomously. This aligns with the EMR module's established rule that AI drafts remain suggestions until a clinician accepts them.
- **Existing foundations are reused**: authentication/RBAC (Module 2), patient/doctor/admin portal shells (Modules 3–5), platform services (Module 6's platform: notifications, storage, audit), and the EMR chart/consent/release model (Module 7's predecessor, Module 6 EMR). The existing `TELEHEALTH`/`DATA_SHARING` consent framework covers AI personalization consent via a data-use consent type.
- **AI provider is external and pluggable**: the platform consumes one or more third-party AI models; model choice is an admin configuration concern, not a per-user concern. Production use of PHI with any vendor requires contractual safeguards (BAA/equivalent) before go-live — an ops gate, not a product blocker.
- **Regulatory posture**: the AI platform is positioned as an assistive/informational tool, not a certified medical device or autonomous diagnostic system; wording throughout patient surfaces reflects this.
- **Cost model**: usage-based provider billing is assumed; budgets and metering are tracked in platform records and do not need to reconcile to the provider's invoice in real time (daily-level accuracy is acceptable).
- **Retention**: AI conversations and symptom sessions follow platform retention defaults (clinically linked artifacts inherit EMR retention ≥6 years; purely conversational history retained per ops policy, soft-hidden on user deletion).
- **Adult account holders**: minors/proxy access is out of v1, consistent with the EMR module.
- **Out of scope for v1**: voice input/output, real-time ambient scribing during video calls, autonomous appointment actions by the AI, AI-generated billing codes, patient-facing model choice, external EHR data ingestion for AI context, and offline AI.
