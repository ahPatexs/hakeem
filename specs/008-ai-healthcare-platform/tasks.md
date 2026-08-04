# Tasks: AI Healthcare Platform (Module 7)

**Input**: Design documents from `/specs/008-ai-healthcare-platform/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ai-api.md, contracts/ui.md, quickstart.md

**Tests**: Explicitly requested (Prompt Testing, AI Evaluation, Security, Performance, Integration) ? test tasks included per story plus a cross-cutting test phase.

**Organization**: Phases 1?2 are Setup + Foundational (AI SDK, Prompt Library, AI Services, Context Management, Vector DB, Embeddings, Rate Limiting, Cost Tracking). Phases 3?9 map to spec user stories US1?US7 in priority order. Phase 10 is Polish/production readiness.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1?US7 from spec.md (user story phases only)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies, schema, migrations, seeds, env

- [x] T001 Install AI dependencies: `npm install openai langchain @langchain/openai` (verify no peer conflicts with Next 15/React 19); add `OPENAI_API_KEY`, `AI_ASSISTANT_PROVIDER` docs to `.env.example`
- [x] T002 Add Module 7 enums + models to `prisma/schema.prisma` per `data-model.md` (AiConversation, AiMessage, AiSymptomSession, AiRecommendation, AiDraftArtifact, AiPromptTemplate, AiPromptVersion, AiModelConfig, AiUsageEvent, AiCostBudget, AiGuardrailEvent, AiFeedback, AiKnowledgeDoc, AiKnowledgeChunk) with relations to User/Appointment
- [x] T003 Create migration `prisma/migrations/*_ai_module7/migration.sql` including raw SQL: `CREATE EXTENSION IF NOT EXISTS vector` and HNSW index on `AiKnowledgeChunk.embedding` (cosine); run `prisma migrate dev` + `prisma generate`
- [x] T004 Seed defaults in `prisma/seed.ts`: one AiPromptTemplate + published AiPromptVersion (en+ar bodies) per AiFeatureKey, default AiModelConfig per feature (provider STUB), one GLOBAL AiCostBudget, 4?6 bilingual AiKnowledgeDoc rows (education/self-care/wellness) ? all idempotent upserts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: AI SDK access (ports/adapters), Prompt Library, core AI services, Context Management, Vector DB + Embeddings, Rate Limiting, Cost Tracking. **No user story work until this phase completes.**

**?? CRITICAL ? everything below Phase 2 depends on these.**

- [x] T005 [P] Extend `src/ports/ai-assistant.ts` with required `streamChat` + token-usage return metadata; create `src/ports/ai-embeddings.ts` (`AiEmbeddingsPort.embed(texts) ? number[][]` + model name)
- [x] T006 [P] Create `src/adapters/openai-ai.ts` (OpenAI SDK chat + streaming, maps params from model config, returns token usage) and `src/adapters/openai-embeddings.ts` (text-embedding-3-small); wire provider selection + BAA gate passthrough in `src/adapters/index.ts`
- [x] T007 [P] Extend `src/adapters/stub-ai.ts` with deterministic streaming, canned bilingual responses, deterministic embedding vectors, and a failure mode toggle (`AI_STUB_MODE=fail`) for degradation tests
- [x] T008 [P] Create pure domain rules: `src/domain/ai/red-flags.ts` (bilingual red-flag lexicon/pattern scan), `src/domain/ai/guardrails.ts` (injection heuristics + patient output policy), `src/domain/ai/prompt-lifecycle.ts` (draft?publish?rollback transitions), `src/domain/ai/budget.ts` (threshold/hard-cap math), `src/domain/ai/context-policy.ts` (consent-mode + minimization rules), `src/domain/ai/access.ts` (feature ? role access map; doctor ? care relationship required)
- [x] T009 Create `src/actions/ai/_actor.ts` resolving session ? `{ userId, role }` actor mirroring `src/actions/emr/_actor.ts`, plus `toActionResult` envelope with new codes `BUDGET_EXHAUSTED`, `CONSENT_REQUIRED` added to the platform outcome taxonomy in `src/domain/platform/outcomes.ts`
- [x] T010 [P] Create `src/lib/ai/prompts.ts`: template/version CRUD, transactional publish (archives prior), rollback-as-new-version, short-TTL in-process cache + invalidation on publish, composition helper returning code-owned safety layer + published body (en/ar)
- [x] T011 [P] Create `src/lib/ai/models.ts`: active config resolution per feature (TTL cache), versioned save (one active per feature transactionally), fallback resolution
- [x] T012 [P] Create `src/lib/ai/vector.ts`: typed pgvector cosine search over AiKnowledgeChunk (locale filter + cross-locale fallback + similarity threshold, top-k 5) via `$queryRaw`
- [x] T013 [P] Create `src/lib/ai/metering.ts`: `recordUsage()` writing AiUsageEvent (no content) with estimated cost from a code-maintained pricing table; fire-and-forget helper that never throws into the hot path
- [x] T014 [P] Create `src/lib/ai/budgets.ts`: budget CRUD, `checkBudget(feature)` pre-flight (month-to-date spend vs budget; threshold breach ? notify admins via `src/lib/platform/notifications.ts` once per period; hard cap ? `BUDGET_EXHAUSTED`)
- [x] T015 [P] Create `src/lib/ai/audit.ts`: `ai.*` audit event helpers appending to the platform audit stream (types per contracts ?8)
- [x] T016 Create `src/lib/ai/context.ts`: consent check (reuse EMR `requireConsent` with `DATA_SHARING`) ? personalized vs general mode; chart snapshot via `buildAiChartContext` (patient-visible vs clinician-grade per actor); KB retrieval via vector helper; returns delimited grounding block + evidence descriptor (chartCategories, kbSources) per FR-024
- [x] T017 Create `src/lib/ai/orchestration.ts`: LangChain chain assembly ? safety layer + published prompt + grounding block + conversation window; streaming + non-streaming generation; fallback-model retry on provider error; post-generation output-policy check for patient features; returns content + usage + trace ids
- [x] T018 [P] Add per-user per-feature rate limiting for AI entry points reusing the platform rate-limit pattern (patient chat 30/hr, symptom 10/day, doctor generation 60/hr) in `src/lib/ai/rate-limit.ts`
- [x] T019 [P] Create `scripts/ai-ingest-kb.ts`: chunk (~800 tokens/100 overlap, heading-aware via LangChain splitter), embed via port, upsert AiKnowledgeChunk with content-hash idempotency and `--all` re-ingest flag
- [x] T020 [P] Create `src/lib/ai/index.ts` barrel + add `ai.*` message namespaces scaffold (common keys: disclaimer, emergency, unavailable, consentRequired, rateLimited) to `src/i18n/messages/en.json` and `src/i18n/messages/ar.json`
- [x] T021 Foundational unit tests (write before dependent stories; all pure): [x] `tests/unit/ai/red-flags.test.ts` (en+ar triggers, benign non-triggers), [x] `tests/unit/ai/guardrails.test.ts` (injection + output policy), [x] `tests/unit/ai/prompt-lifecycle.test.ts`, [x] `tests/unit/ai/budget.test.ts`, [x] `tests/unit/ai/context-policy.test.ts`, [x] `tests/unit/ai/i18n-keys.test.ts` (extend parity to `ai.*`)

**Checkpoint**: Ports/adapters, guardrails, prompts, models, context, metering, budgets, rate limits, vector search all unit-testable ? user stories can start (in parallel if staffed).

---

## Phase 3: User Story 1 ? Patient AI Medical Assistant + Conversation History (Priority: P1) ?? MVP

**Goal**: Streaming patient chat with Health Q&A, disclaimers, red-flag escalation, refusal policy, and owner-scoped conversation history (FR-001?FR-008).

**Independent Test**: quickstart scenarios 1?2 ? chat en/ar with disclaimer, refusal on prescribe request, red-flag emergency banner, history reopen/hide, strict ownership.

### Tests for User Story 1

- [x] T022 [P] [US1] Integration test chat flow (stub adapter): start conversation ? message ? assistant reply persisted with promptVersionId/modelConfigId, red-flag short-circuit, windowing + rolling summary ? `tests/integration/ai/chat-flow.test.ts`
- [x] T023 [P] [US1] Security test conversation ownership + role scoping (patient A vs B, doctor, admin) ? `tests/security/ai/conversations.test.ts`

### Implementation for User Story 1

- [x] T024 [US1] Create `src/lib/ai/conversations.ts`: start/list/get/rename/hide (owner-scoped, ACTIVE default), message append, window assembly (last 12 + rolling summary update), red-flag pre-scan producing SYSTEM_NOTICE message, orchestration call, metering + audit hooks
- [x] T025 [US1] Create `src/actions/ai/conversations.ts`: `aiListConversations`, `aiGetConversation`, `aiStartConversation`, `aiRenameConversation`, `aiHideConversation` (Zod per contracts ?2)
- [x] T026 [US1] Create `src/app/api/ai/chat/route.ts`: SSE stream per contracts ?1 ? session auth, actor resolve, access/consent/rate-limit/budget/guardrail chain identical to actions, `meta`/`token`/`notice`/`done`/`error` events, persist on completion
- [x] T027 [P] [US1] Create `src/hooks/ai/use-ai-chat.ts` (SSE consume, append-to-React-Query-cache on done, error-code mapping) and `src/hooks/ai/use-ai-conversations.ts` (list/get queries)
- [x] T028 [P] [US1] Create chat components in `src/components/ai/chat/`: `assistant-chat.tsx`, `message-bubble.tsx`, `disclaimer.tsx`, `emergency-banner.tsx` (assertive live region), `conversation-list.tsx` ? Stitch-aligned, RTL-safe, keyboard operable
- [x] T029 [US1] Create patient AI page `src/app/[locale]/patient/ai/page.tsx` mounting chat + history per contracts/ui.md; add patient nav entry per Stitch
- [x] T030 [US1] Add `ai.chat.*` + `ai.conversations.*` i18n keys (en+ar) for all US1 UI strings

**Checkpoint**: Patient assistant fully functional as MVP.

---

## Phase 4: User Story 2 ? Doctor AI Clinical Documentation (Priority: P1)

**Goal**: AI SOAP + consultation-summary drafts with human-in-the-loop acceptance into EMR flows (FR-016?FR-019).

**Independent Test**: quickstart scenario 4 ? generate SOAP draft in consultation workspace, accept ? EMR draft populated, sign carries `aiAssisted: true`; provider-down degradation leaves manual flow intact.

### Tests for User Story 2

- [x] T031 [P] [US2] Integration test draft lifecycle: generate (stub) ? PENDING ? accept ? EMR SOAP draft created via facade with doctor actor + `acceptedIntoId` set; discard path; AI-cannot-sign invariant ? `tests/integration/ai/drafts.test.ts`
- [x] T032 [P] [US2] Security test: draft generation denied without care relationship; patient cannot see PENDING drafts; accept requires doctor actor ? `tests/security/ai/drafts.test.ts`

### Implementation for User Story 2

- [x] T033 [US2] Create `src/lib/ai/drafts.ts`: `generateSoapDraft`, `generateConsultationSummary` (clinician-grade context via `lib/ai/context`, patient-locale output for summaries), AiDraftArtifact persistence with evidence, `acceptDraft` bridging to `saveSoapDraft`/summary facade in `src/lib/emr/notes.ts` (stamps aiAssisted), `discardDraft`; audit generate/accept/discard
- [x] T034 [US2] Create `src/actions/ai/drafts.ts`: `aiGenerateSoapDraft`, `aiGenerateConsultationSummary`, `aiAcceptDraft`, `aiDiscardDraft` (Zod per contracts ?5)
- [x] T035 [P] [US2] Create `src/components/ai/doctor/draft-panel.tsx`: generate buttons, AI-assisted draft label, editable preview, accept/discard, evidence line, unavailable state
- [x] T036 [US2] Mount draft panel in `src/app/[locale]/doctor/consultations/[appointmentId]/page.tsx` (SOAP + summary tabs area per Stitch; no redesign)
- [x] T037 [US2] Add `ai.drafts.*` i18n keys (en+ar)

**Checkpoint**: Both P1 stories deliverable ? patient assistant + doctor documentation.

---

## Phase 5: User Story 3 ? Symptom Checker (Priority: P2)

**Goal**: Guided non-diagnostic triage sessions with escalate-only red-flag override and booking attachment (FR-009?FR-012).

**Independent Test**: quickstart scenarios 2?3 ? mild complaint ? SELF_CARE/SEE_DOCTOR with rationale + disclaimer; red-flag ? EMERGENCY; attach session to booking visible to doctor.

### Tests for User Story 3

- [x] T038 [P] [US3] Integration test session state machine: start ? steps ? outcome; red-flag mid-session forces EMERGENCY (escalate-only assertion); attach-to-booking authorization ? `tests/integration/ai/symptom.test.ts`
- [x] T039 [P] [US3] Unit test outcome-escalation rule (LLM-proposed outcome can never downgrade deterministic red-flag result) in `tests/unit/ai/symptom-outcome.test.ts`

### Implementation for User Story 3

- [x] T040 [US3] Create `src/lib/ai/symptom.ts`: session create/answer/get, structured steps JSON, LLM next-question + outcome proposal via orchestration, deterministic escalate-only validation, completion + attachment (`appointmentId` owned by patient), metering/audit
- [x] T041 [US3] Create `src/actions/ai/symptom.ts`: `aiStartSymptomSession`, `aiAnswerSymptomStep`, `aiGetSymptomSession`, `aiAttachSessionToBooking` (Zod per contracts ?3)
- [x] T042 [P] [US3] Create `src/components/ai/symptom/session-wizard.tsx` + `outcome-card.tsx` (rationale, non-diagnostic disclaimer, emergency state, attach CTA) and `src/hooks/ai/use-symptom-session.ts`
- [x] T043 [US3] Create `src/app/[locale]/patient/ai/symptom-checker/page.tsx` per contracts/ui.md; surface attached session summary in the doctor consultation workspace pre-visit context block
- [x] T044 [US3] Add `ai.symptom.*` i18n keys (en+ar)

**Checkpoint**: Symptom checker independently testable.

---

## Phase 6: User Story 4 ? Rx Assistance & Clinical Decision Support (Priority: P2)

**Goal**: Evidence-cited prescription suggestions with mandatory conflict surfacing + dismissible CDS insights (FR-020?FR-023).

**Independent Test**: quickstart scenario 5 ? penicillin-allergy patient: antibiotic suggestion shows conflict citing chart evidence before accept; accept feeds the normal EMR draft + sign safety flow.

### Tests for User Story 4

- [x] T045 [P] [US4] Integration test: suggestion for allergic patient includes ALLERGY conflict with evidence; accept populates prescription draft only; uncertain-input ? explicit no-safe-suggestion response ? `tests/integration/ai/clinical-support.test.ts`
- [x] T046 [P] [US4] Security test: no care relationship ? FORBIDDEN for suggest/CDS; patient role denied entirely ? `tests/security/ai/clinical-support.test.ts`

### Implementation for User Story 4

- [x] T047 [US4] Create `src/lib/ai/clinical-support.ts`: `suggestPrescription` (intent + clinician context ? RX_SUGGESTION AiDraftArtifact with conflicts computed deterministically against chart allergies/active meds, evidence block), `listCdsInsights`/`dismissCdsInsight` (evidence-cited, chart-read-only), honest "no safe suggestion" path
- [x] T048 [US4] Create `src/actions/ai/clinical-support.ts`: `aiSuggestPrescription`, `aiListCdsInsights`, `aiDismissCdsInsight` (Zod per contracts ?5); accept path reuses `aiAcceptDraft` bridging into the EMR prescription draft flow in `src/lib/emr/prescriptions.ts`
- [x] T049 [P] [US4] Create `src/components/ai/doctor/rx-suggest-panel.tsx` (suggestion, conflict flags prominent pre-accept, evidence) and `src/components/ai/doctor/cds-insights.tsx` (dismissible insight cards)
- [x] T050 [US4] Mount rx-suggest panel on the prescription compose page `src/app/[locale]/doctor/prescriptions/new/page.tsx` and CDS insights on `src/app/[locale]/doctor/patients/[id]/page.tsx` per Stitch
- [x] T051 [US4] Add `ai.rx.*` + `ai.cds.*` i18n keys (en+ar)

**Checkpoint**: All doctor AI surfaces complete.

---

## Phase 7: User Story 5 ? AI Operations Dashboard, Usage & Cost Analytics (Priority: P2)

**Goal**: Admin visibility into usage, quality, health, and spend with budget alerts (FR-034?FR-037).

**Independent Test**: quickstart scenario 7.1/7.4 ? dashboard aggregates render and reconcile across filters; tiny hard-cap budget blocks chat with friendly state and notifies admins; non-admin denied.

### Tests for User Story 5

- [x] T052 [P] [US5] Integration test: usage events aggregate correctly by feature/role/locale/period; budget threshold notify-once + hard-cap `BUDGET_EXHAUSTED`; totals reconcile between dashboard and usage list ? `tests/integration/ai/ops.test.ts`
- [x] T053 [P] [US5] Security test: all admin actions deny PATIENT/DOCTOR; usage rows contain no message content ? `tests/security/ai/admin.test.ts`

### Implementation for User Story 5

- [x] T054 [US5] Create `src/lib/ai/ops.ts`: period-scoped aggregates (usage by feature/role/locale, latency p50/p95, error/refusal rates, guardrail counts, feedback ratios, cost vs budget) via indexed SQL aggregates over AiUsageEvent/AiGuardrailEvent/AiFeedback
- [x] T055 [US5] Create `src/actions/ai/admin.ts` (part 1): `aiAdminGetOpsDashboard`, `aiAdminListUsage`, `aiAdminSaveBudget`, `aiAdminGetGuardrailEvents` (Zod per contracts ?7; ADMIN-only, audited)
- [x] T056 [P] [US5] Create `src/components/ai/admin/ops-dashboard.tsx`, `usage-charts.tsx`, `budget-form.tsx`, `guardrail-log.tsx` (period selector, filters, breach prominence; no content display)
- [x] T057 [US5] Create `src/app/[locale]/admin/ai/page.tsx` (+ `usage/`, `budgets/`, `monitoring/` sub-routes per contracts/ui.md); add admin nav entries in `src/components/admin/shell/admin-nav.tsx`
- [x] T058 [US5] Add `ai.admin.*` i18n keys (en+ar) for dashboard/usage/budget/monitoring strings

**Checkpoint**: Ops can run and cost-control the platform.

---

## Phase 8: User Story 6 ? Prompt & Model Management (Priority: P3)

**Goal**: Versioned prompt draft/publish/rollback and per-feature model configs with fallback, fully audited (FR-038?FR-040).

**Independent Test**: quickstart scenario 7.2/7.3 ? draft edit leaves live traffic unchanged; publish takes effect; rollback restores within a minute; model reassignment stamps new `modelConfigId`.

### Tests for User Story 6

- [x] T059 [P] [US6] Integration test prompt lifecycle end-to-end: draft ? publish (archives prior) ? new chat uses new version ? rollback appends re-published clone ? cache invalidation ? TTL; model config save bumps version + one-active invariant ? `tests/integration/ai/prompt-model-mgmt.test.ts`

### Implementation for User Story 6

- [x] T060 [US6] Extend `src/actions/ai/admin.ts` (part 2): `aiAdminListPromptTemplates`, `aiAdminSavePromptDraft`, `aiAdminPublishPrompt`, `aiAdminRollbackPrompt`, `aiAdminListModelConfigs`, `aiAdminSaveModelConfig` (Zod per contracts ?7; audited via `lib/ai/audit`)
- [x] T061 [P] [US6] Create `src/components/ai/admin/prompt-editor.tsx` (en+ar bodies, change note, version history list, publish/rollback with confirm, read-only safety-layer display) and `model-config-form.tsx` (feature, provider, model, params, fallback)
- [x] T062 [US6] Create `src/app/[locale]/admin/ai/prompts/page.tsx` and `src/app/[locale]/admin/ai/models/page.tsx` per contracts/ui.md; extend admin nav
- [x] T063 [US6] Add `ai.admin.prompts.*` + `ai.admin.models.*` i18n keys (en+ar)

**Checkpoint**: Admin behavior control complete without deploys.

---

## Phase 9: User Story 7 ? Health Education & Personalized Recommendations (Priority: P3)

**Goal**: Explainable, dismissible recommendations with general-wellness fallback; RAG-grounded education content (FR-013?FR-015).

**Independent Test**: quickstart scenario 6 + US7 acceptance ? condition-relevant recommendation shows "why", dismissal persists, consent-withdrawn/general users get wellness content.

### Tests for User Story 7

- [x] T064 [P] [US7] Integration test: personalized generation cites only patient-visible categories; dismissal persists; no-data and no-consent paths return general wellness content ? `tests/integration/ai/recommendations.test.ts`

### Implementation for User Story 7

- [x] T065 [US7] Create `src/lib/ai/recommendations.ts`: generate/list ACTIVE recommendations (consented: chart-informed reasons + KB grounding; otherwise general), `dismissRecommendation`, per-(patient, day) regeneration guard
- [x] T066 [US7] Create `src/actions/ai/recommendations.ts`: `aiListRecommendations`, `aiDismissRecommendation` (Zod per contracts ?4)
- [x] T067 [P] [US7] Create `src/components/ai/recommendations/recommendation-card.tsx` (reason line, dismiss) + `education-list.tsx` (KB-sourced education content, locale-filtered)
- [x] T068 [US7] Create `src/app/[locale]/patient/ai/health/page.tsx` per contracts/ui.md; add patient nav entry
- [x] T069 [US7] Add `ai.recommendations.*` + `ai.education.*` i18n keys (en+ar)

**Checkpoint**: All seven user stories functional.

---

## Phase 10: Polish, Cross-Cutting Tests & Production Readiness

**Purpose**: Feedback loop, consent UX, prompt/eval/security/perf test suites, e2e, a11y, quickstart validation

- [x] T070 [P] Create `src/actions/ai/feedback.ts` (`aiSubmitFeedback`, upsert per message+user) + `src/components/ai/feedback/response-feedback.tsx`; mount in chat message bubbles and draft panels; wire into ops feedback ratios; add `ai.feedback.*` keys (en+ar)
- [x] T071 [P] Consent UX polish: `CONSENT_REQUIRED`/general-mode notice component in `src/components/ai/chat/consent-notice.tsx` linking to the existing consent flow; verify withdraw ? general mode ? re-consent restores personalization (quickstart scenario 6)
- [x] T072 [P] Prompt testing suite: `tests/unit/ai/prompt-composition.test.ts` ? safety layer always present and non-removable, locale directive correctness, grounding block delimitation, per-feature published-version resolution
- [x] T073 [P] AI evaluation suite (stub-deterministic): `tests/integration/ai/evaluation.test.ts` ? refusal policy on diagnosis/prescribe asks, disclaimer presence on every patient response, explainability evidence present when personalized, honest-uncertainty path
- [x] T074 [P] Security test suite completion: `tests/security/ai/rbac.test.ts` full feature ? role matrix incl. streaming route guard parity, `tests/security/ai/consent.test.ts` consent-mode enforcement at context assembly
- [x] T075 [P] Performance tests: `tests/perf/ai/retrieval.perf.test.ts` (vector search + context assembly p95 < 500ms against seeded KB) and `tests/perf/ai/ops.perf.test.ts` (dashboard aggregates < 2s at synthetic 100k usage events)
- [x] T076 [P] E2E smoke: `tests/e2e/ai/smoke.spec.ts` + reuse `tests/e2e/emr/fixtures.ts` login fixtures ? patient chat/symptom/health, doctor draft panel, admin dashboard/prompts; unauthenticated redirects
- [x] T077 [P] A11y checks: `tests/a11y/ai/chat.a11y.ts` (labels/roles/live regions, keyboard flow) and `tests/a11y/ai/admin.a11y.ts` following the EMR a11y test pattern
- [x] T078 Run `scripts/ai-ingest-kb.ts` against seeded docs; verify HNSW index used (EXPLAIN) and cross-locale fallback works; document corpus-update runbook note in `specs/008-ai-healthcare-platform/quickstart.md`
- [x] T079 Full validation pass: `npx tsc --noEmit`, `npx vitest run tests/unit/ai tests/security/ai tests/integration/ai`, quickstart scenarios 1?8 manually verified; fix any regressions in EMR/portal suites caused by shared-file edits
- [x] T080 Production-readiness checklist in plan constraints: BAA gate verified for non-stub provider, `.env.example` complete, budgets seeded, rate limits active, no message content in AiUsageEvent/AiGuardrailEvent rows (row inspection), graceful degradation verified with `AI_STUB_MODE=fail`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 ? Phase 2**: schema/seeds before foundational services
- **Phase 2 blocks all user stories** (ports, guardrails, prompts, models, context, metering, budgets, rate limits, vector)
- **Phases 3?9**: independently implementable after Phase 2, in priority order P1(US1,US2) ? P2(US3,US4,US5) ? P3(US6,US7)
- **Phase 10**: after desired stories complete (T070/T071 need US1; T072?T075 need Phase 2; T076?T077 need mounted UI)

### Story-level notes

- **US2 & US4** depend on existing EMR facades (`lib/emr/notes.ts`, `lib/emr/prescriptions.ts`) ? read-only reuse plus accept-bridge calls; no EMR schema changes
- **US5** consumes usage events emitted by any earlier story but is testable with synthetic events alone
- **US6** modifies behavior consumed by US1?US4 via the prompt/model caches ? safe to build last
- **US7** needs the KB ingestion output (T019 + T078 seed docs)

### Parallel Opportunities

```text
Phase 2: T005?T008 in parallel ? T009 ? T010?T015, T018?T020 in parallel ? T016 ? T017 ? T021
Stories after Phase 2 (multi-dev): Dev A US1 ? US3 ? US7 ? Dev B US2 ? US4 ? Dev C US5 ? US6
Within each story: test tasks [P] first, then lib ? actions ? components/hooks [P] ? page mount ? i18n
```

---

## Implementation Strategy

1. **MVP** = Phases 1?3 (patient assistant streaming chat with history + full safety posture) ? demoable alone.
2. Add US2 to complete the P1 pair (doctor documentation) ? validate quickstart 1?4.
3. P2 wave: US3, US4, US5 (independent of each other).
4. P3 wave: US6, US7.
5. Phase 10 gates production: prompt/eval/security/perf/e2e suites green + readiness checklist (Definition of Done: AI services operational, secure interactions, explainable responses, available across all portals, production ready).

## Notes

- Stub adapter keeps every test deterministic and PHI-free; OpenAI adapter is exercised manually behind the BAA gate.
- No AI code path may mutate the chart: acceptance bridges always pass the human actor into existing EMR flows.
- en/ar parity enforced by extending `tests/unit/ai/i18n-keys.test.ts`; RTL verified per surface in a11y/e2e.

---

## Phase 11: Convergence

**Purpose**: Close residual gaps after Phase 10 implement ? patient explainability UI, consultation-summary patient locale, legacy AI path cutover, LangChain quarantine, symptom history/booking attach, Stitch design manifest, and consent error-path cleanup.

- [x] T081 CRITICAL: Persist and render FR-024 explainability on personalized patient assistant messages (chartCategories/kbSources) via SSE done payload + `MessageDto` + `src/components/ai/chat/message-bubble.tsx`; evidence already computed in `src/lib/ai/context.ts` / `orchestration.ts` but never surfaced in chat (partial)
- [x] T082 CRITICAL: Retire or redirect legacy doctor AI dual stack (`src/components/doctor/workspace/ai-panel.tsx`, `src/actions/doctor/ai.ts`, `src/app/api/doctor/ai/chat/route.ts`, `doctor/ai` pages) onto Module 7 `lib/ai` + `/api/ai/chat` / draft facades so prompts, metering, guardrails, and RBAC cannot be bypassed per FR-029, FR-035, plan: sole AI entry (contradicts)
- [x] T083: Resolve patient preferred locale server-side in `aiGenerateConsultationSummary` / `src/lib/ai/drafts.ts` instead of doctor `useLocale()` in `src/components/ai/doctor/draft-panel.tsx` so AI consultation summaries are generated in the patient's locale per FR-019, US2/AC3 (partial)
- [x] T084: Quarantine LangChain usage into `src/lib/ai/orchestration.ts` and `scripts/ai-ingest-kb.ts` (chains/RAG/text splitter) per plan: LangChain quarantine / T017, or remove unused `langchain` / `@langchain/openai` deps if hand-rolled orchestration remains the SoT (contradicts)
- [x] T085: Add patient symptom-session history UI and end-to-end attach during booking (`patient/appointments/book` or create-then-attach) completing FR-012 / US3/AC3 beyond attach-to-existing-upcoming only (partial)
- [x] T086: Create `specs/008-ai-healthcare-platform/design/manifest.json` tracking Stitch export state per AI surface per contracts/ui.md Design manifest (missing)
- [x] T087: Remove dead `CONSENT_REQUIRED` UI path or emit it only where a hard consent gate is intended; keep FR-030 general-mode (`CONSENT_GENERAL_MODE`) as the SoT for withdrawn DATA_SHARING consent (partial)
- [x] T088: Delete or hard-deprecate unused legacy patient AI surfaces (`src/actions/patient/ai.ts`, `src/app/api/patient/ai/chat/route.ts`, `src/components/patient/ai/ai-chat-panel.tsx`) after confirming Module 7 patient page is the only entry (unrequested)
