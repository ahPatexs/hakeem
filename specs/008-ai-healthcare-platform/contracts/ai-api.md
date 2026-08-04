# API Contracts: AI Healthcare Platform (Module 7)

**Date**: 2026-08-04 · **Plan**: [../plan.md](../plan.md) · **Data model**: [../data-model.md](../data-model.md)

All Server Actions live in `src/actions/ai/*`: Zod-validated input, actor resolved server-side (never from client), returning the platform envelope:

```ts
type ActionResult<T> = { ok: true; data: T } | { ok: false; code: PlatformOutcomeCode };
// codes: SUCCESS | VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND |
//        RATE_LIMITED | DEPENDENCY_UNAVAILABLE | BUDGET_EXHAUSTED | CONSENT_REQUIRED
```

Common guards executed by every action/route (in order): session → actor role → feature access (doctor ⇒ care relationship via EMR) → consent mode resolution → rate limit → budget check → guardrails. Denials audited.

## 1. Streaming chat — route handler

`POST /api/ai/chat` (Node runtime, SSE)

Request (JSON):

```ts
{
  conversationId?: string;   // omit to start a new conversation
  feature: "PATIENT_ASSISTANT" | "DOCTOR_SOAP" | "DOCTOR_SUMMARY";
  patientUserId?: string;    // doctor features only; care relationship enforced
  appointmentId?: string;    // doctor draft generation context
  message: string;           // 1..4000 chars
  locale: "en" | "ar";
}
```

SSE events:

| event | data | meaning |
|---|---|---|
| `meta` | `{ conversationId, messageId }` | ids allocated before generation |
| `token` | `{ t: string }` | next content token(s) |
| `notice` | `{ kind: "RED_FLAG" \| "CONSENT_GENERAL_MODE", text }` | safety/system notice (may precede or replace tokens) |
| `done` | `{ messageId, disclaimerShown: true }` | generation complete; message persisted |
| `error` | `{ code }` | terminal error (same code taxonomy) |

Rules: red-flag on input ⇒ `notice(RED_FLAG)` + `done` without provider call (FR-006). Budget hard-cap ⇒ `error(BUDGET_EXHAUSTED)`. Provider outage after retry-with-fallback ⇒ `error(DEPENDENCY_UNAVAILABLE)` (FR-027).

## 2. Conversations (Server Actions)

| Action | Input | Output `data` | Notes |
|---|---|---|---|
| `aiListConversations` | `{ page? }` | `{ items: ConversationSummary[], total }` | owner-scoped, ACTIVE only, newest first (FR-003/004) |
| `aiGetConversation` | `{ conversationId, page? }` | `{ conversation, messages: MessageDto[] }` | owner-scoped |
| `aiStartConversation` | `{ feature, locale }` | `{ conversationId }` | |
| `aiRenameConversation` | `{ conversationId, title }` | `{ id }` | title ≤120 chars |
| `aiHideConversation` | `{ conversationId }` | `{ id }` | soft-hide; audited |

```ts
type MessageDto = {
  id: string; role: "USER" | "ASSISTANT" | "SYSTEM_NOTICE";
  content: string; redFlagged: boolean; disclaimerShown: boolean; createdAt: string;
};
```

## 3. Symptom checker (Server Actions)

| Action | Input | Output `data` | Notes |
|---|---|---|---|
| `aiStartSymptomSession` | `{ locale, complaint }` | `{ sessionId, nextQuestion }` | red-flag scan on complaint (FR-011) |
| `aiAnswerSymptomStep` | `{ sessionId, answer }` | `{ nextQuestion } \| { outcome }` | outcome = `{ kind, rationale, disclaimer }` |
| `aiGetSymptomSession` | `{ sessionId }` | `{ session }` | owner-scoped |
| `aiAttachSessionToBooking` | `{ sessionId, appointmentId }` | `{ sessionId }` | patient's own appointment only (FR-012) |

`outcome.kind ∈ SELF_CARE | SEE_DOCTOR | URGENT | EMERGENCY`; deterministic red-flag layer may only escalate (research R9). Every outcome carries the non-diagnostic disclaimer (FR-010).

## 4. Recommendations & education (Server Actions)

| Action | Input | Output `data` | Notes |
|---|---|---|---|
| `aiListRecommendations` | `{}` | `{ items: RecommendationDto[] }` | personalized when consented; general wellness otherwise (FR-013/015) |
| `aiDismissRecommendation` | `{ recommendationId }` | `{ id }` | persistent (FR-014) |

`RecommendationDto = { id, title, body, reason, sourceKinds, createdAt }` — `reason` references only patient-visible data.

## 5. Doctor AI (Server Actions)

| Action | Input | Output `data` | Notes |
|---|---|---|---|
| `aiGenerateSoapDraft` | `{ patientUserId, appointmentId, doctorInput? }` | `{ draftId, content: SoapFields, evidence }` | care relationship required (FR-016/023) |
| `aiGenerateConsultationSummary` | `{ patientUserId, appointmentId, locale }` | `{ draftId, content: { body }, evidence }` | patient locale output (FR-019) |
| `aiSuggestPrescription` | `{ patientUserId, intent }` | `{ draftId, content: RxFields, evidence, conflicts }` | conflicts computed against chart allergies/active meds (FR-021) |
| `aiListCdsInsights` | `{ patientUserId }` | `{ items: CdsInsightDto[] }` | each cites evidence; dismissible (FR-022) |
| `aiDismissCdsInsight` | `{ insightId }` | `{ id }` | |
| `aiAcceptDraft` | `{ draftId, edits? }` | `{ draftId, acceptedIntoId }` | bridges to EMR draft flow with doctor actor; EMR stamps `aiAssisted`; signing stays in EMR (FR-017/018/045) |
| `aiDiscardDraft` | `{ draftId }` | `{ draftId }` | |

```ts
type Evidence = { chartCategories: string[]; kbSources: string[] };       // FR-024
type Conflict = { kind: "ALLERGY" | "INTERACTION"; detail: string; evidence: string };
```

## 6. Feedback (Server Action)

| Action | Input | Output `data` |
|---|---|---|
| `aiSubmitFeedback` | `{ messageId, rating: "HELPFUL"\|"NOT_HELPFUL"\|"FLAGGED", category? }` | `{ id }` |

One feedback row per (message, user); upsert semantics (FR-026).

## 7. Administration (Server Actions — ADMIN only)

| Action | Input | Output `data` | Notes |
|---|---|---|---|
| `aiAdminGetOpsDashboard` | `{ from, to }` | `{ usage, cost, latency, errors, guardrails, feedback }` | aggregates only; no content (FR-034) |
| `aiAdminListUsage` | `{ from, to, feature?, role?, locale?, page? }` | `{ items: UsageRowDto[], total }` | reconciles with dashboard (SC-008) |
| `aiAdminListPromptTemplates` | `{}` | `{ items: TemplateWithVersions[] }` | |
| `aiAdminSavePromptDraft` | `{ templateId, bodyEn, bodyAr, changeNote? }` | `{ versionId, version }` | live traffic unaffected (FR-038) |
| `aiAdminPublishPrompt` | `{ versionId }` | `{ versionId }` | archives prior published; audited |
| `aiAdminRollbackPrompt` | `{ templateId, toVersion, reason }` | `{ versionId }` | appends re-published clone; audited (SC-009) |
| `aiAdminListModelConfigs` | `{}` | `{ items: ModelConfigDto[] }` | |
| `aiAdminSaveModelConfig` | `{ feature, provider, modelName, fallbackModel?, temperature?, maxOutputTokens? }` | `{ id, version }` | versioned + audited (FR-039) |
| `aiAdminSaveBudget` | `{ scope, feature?, monthlyUsd, alertThreshold, hardCap }` | `{ id }` | (FR-036) |
| `aiAdminGetGuardrailEvents` | `{ from, to, trigger?, page? }` | `{ items, total }` | metadata only (FR-025) |

## 8. Audit event types (appended to platform audit)

`ai.conversation.create` · `ai.conversation.hide` · `ai.context.access` (already emitted by EMR `buildAiChartContext`) · `ai.draft.generate` · `ai.draft.accept` · `ai.draft.discard` · `ai.guardrail.trigger` · `ai.prompt.publish` · `ai.prompt.rollback` · `ai.model.change` · `ai.budget.change` · `ai.access.denied`

## 9. Error-state mapping (UI contract)

| Code | Patient/doctor UI state |
|---|---|
| `CONSENT_REQUIRED` | consent prompt with link to consent flow (general mode still available) |
| `BUDGET_EXHAUSTED` | friendly "assistant temporarily unavailable" |
| `DEPENDENCY_UNAVAILABLE` | same friendly unavailable + retry affordance |
| `RATE_LIMITED` | existing rate-limited copy pattern |
| `FORBIDDEN` / `NOT_FOUND` | safe non-enumerating denial |
