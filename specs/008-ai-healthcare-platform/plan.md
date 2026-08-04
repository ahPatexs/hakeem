# Implementation Plan: AI Healthcare Platform

**Branch**: `008-ai-healthcare-platform` | **Date**: 2026-08-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-ai-healthcare-platform/spec.md` (FR-001–FR-045, SC-001–SC-012).

## Summary

Deliver Hakeem's **AI capability layer** across the three existing portals: patient AI assistant (chat, Health Q&A, symptom checker, education/recommendations, conversation history), doctor AI (SOAP/consultation-summary drafting, prescription assistance, clinical decision support), and administration AI (operations dashboard, usage/cost analytics, prompt management, model management, monitoring). UI follows **approved Stitch** designs — **do not redesign**.

The module composes existing foundations instead of duplicating them: RBAC/actors from Auth + EMR (`assertEmrAccess`), chart grounding from `lib/emr/ai-context.ts` (`buildAiChartContext`), consent gating from EMR consents, the existing `AiAssistantPort` + BAA gate in `lib/platform/ai.ts`, and Platform audit/notifications. New work centralizes under `domain/ai` + `lib/ai` + `actions/ai` + `components/ai`, with an OpenAI adapter (behind the port), LangChain for orchestration, and pgvector on Neon for retrieval.

**Technology stack (mandated)**: Next.js 15 App Router · TypeScript strict · OpenAI SDK · LangChain · Prisma ORM · Neon PostgreSQL (+ pgvector) · React Query · Zod · Server Actions · existing Tailwind/shadcn/`next-intl`.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`), Node.js 20 LTS

**Primary Dependencies**: Next.js 15 (App Router, RSC, Server Actions, streaming route handlers), `openai` SDK, `langchain` + `@langchain/openai` (orchestration only — never leaked into domain layer), Prisma 6.x, Zod, `@tanstack/react-query`, Tailwind + shadcn/ui, `next-intl`, Platform Services (`@/lib/platform/*`), EMR facades (`@/lib/emr/*`)

**Storage**: Neon PostgreSQL — conversations/messages, symptom sessions, drafts, prompt versions, model configs, usage/cost events, budgets, guardrail events, feedback; **pgvector extension** for knowledge-base embeddings (HNSW index)

**Testing**: Vitest (guardrails, red-flag detection, RBAC matrix, consent gating, prompt lifecycle, budget math, context assembly redaction); integration tests with stub AI adapter (deterministic); Playwright smoke per role; i18n parity test extended with `ai.*` keys

**Target Platform**: Vercel + Neon; evergreen browsers; Stitch SoT for AI surfaces

**Project Type**: Web application — AI domain layer inside the single Next.js app (no new service)

**Performance Goals**: First streamed token p50 < 3s / p95 < 15s (SC-001); non-streamed drafts < 30s with progress state; ops dashboard aggregates < 2s from materialized rollups; retrieval (vector + chart context) < 500ms p95

**Constraints**: Stitch SoT (no redesign); EN/AR + RTL + a11y; human-in-the-loop absolute (AI never signs/writes chart — FR-017/FR-045); consent + release-rule-respecting context (FR-030/FR-031); BAA gate before non-stub provider in production (existing `assertBaaGate`); graceful degradation on provider outage/budget cap (FR-027); no raw message content in ops surfaces (FR-028)

**Scale/Scope**: Ambulatory/telemedicine volumes; ~12–16 Stitch-aligned AI surfaces across three portals; single external AI provider (OpenAI) with stub fallback; KB corpus in the low thousands of bilingual documents

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template — **PASS by default**. Discipline applied: one shared AI domain (no per-portal AI forks); provider access only through ports/adapters; LangChain confined to `lib/ai/orchestration`; no new microservice; no UI redesign.

**Post-Phase 1 re-check**: research decisions, data model, API contracts, and all twelve strategy sections documented — **PASS**.

## AI Architecture

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Patient Portal        │ Doctor Portal            │ Admin Portal          │
│ ai assistant, symptom │ doc drafts, rx assist,   │ ops dashboard,        │
│ checker, education    │ decision support         │ prompts, models, cost │
│ components/ai/*  — React Query hooks + streaming chat hook               │
└──────────────┬───────────────────────────────────────────┬───────────────┘
               │ Server Actions (mutations, lists)         │ streaming
┌──────────────▼───────────────────────────┐  ┌────────────▼──────────────┐
│ actions/ai/* (Zod in → typed results)    │  │ app/api/ai/chat/route.ts  │
│ conversations, symptom, drafts, admin    │  │ (SSE token stream; same   │
│                                          │  │  guards as actions)       │
└──────────────┬───────────────────────────┘  └────────────┬──────────────┘
               │                                           │
┌──────────────▼───────────────────────────────────────────▼──────────────┐
│ lib/ai/* facades                                                         │
│ conversations · symptom · drafts · recommendations · guardrails ·        │
│ context (chart+RAG assembly) · prompts · models · metering · budgets ·   │
│ ops · orchestration (LangChain chains)                                   │
│ domain/ai/* pure rules: access, red-flags, guardrail policy,             │
│ prompt lifecycle, budget math, context minimization                      │
└───────┬──────────────────┬───────────────────────┬──────────────────────┘
        │                  │                       │
┌───────▼────────┐ ┌───────▼───────────┐ ┌─────────▼─────────────────────┐
│ Prisma / Neon  │ │ EMR + Platform    │ │ ports/ai-assistant +          │
│ AI tables +    │ │ buildAiChartCtx,  │ │ ports/ai-embeddings           │
│ pgvector KB    │ │ consents, audit,  │ │ adapters: openai-ai (SDK),    │
│                │ │ notifications     │ │ stub-ai (tests/dev)           │
└────────────────┘ └───────────────────┘ └───────────────────────────────┘
```

**Principles**:
1. Every AI entry point resolves an actor and asserts access **before** any provider call; doctor features additionally require the EMR care relationship (reuse `assertEmrAccess`).
2. The AI **never mutates the chart**: drafts live in AI tables; acceptance flows call the existing clinician-controlled EMR facades (`saveSoapDraft`, prescription draft flow) with the human actor.
3. Provider access only via ports (`AiAssistantPort`, new `AiEmbeddingsPort`); OpenAI SDK and LangChain exist only inside `adapters/` and `lib/ai/orchestration.ts`. The stub adapter keeps CI deterministic and PHI-free.
4. Guardrails run **pre-provider** (injection heuristics, red-flag scan on user input) and **post-provider** (output policy: no diagnosis/prescription phrasing to patients, disclaimer injection) — fail-closed.
5. Every assistant response records `promptVersionId` + `modelConfigId` + usage (FR-040); metering never stores message content.
6. Outcomes use the Platform taxonomy (`SUCCESS`, `FORBIDDEN`, `VALIDATION_ERROR`, `DEPENDENCY_UNAVAILABLE`, `RATE_LIMITED`, `BUDGET_EXHAUSTED` added).

### Named AI capabilities

| Capability | Facade | Notes |
|------------|--------|-------|
| Conversations & messages | `lib/ai/conversations` | patient assistant + history (FR-001–FR-008) |
| Symptom checker | `lib/ai/symptom` | session state machine + triage outcome (FR-009–FR-012) |
| Recommendations & education | `lib/ai/recommendations` | RAG over KB + chart reasons (FR-013–FR-015) |
| Doctor documentation drafts | `lib/ai/drafts` | SOAP + consultation summary drafts (FR-016–FR-019) |
| Rx assistance & CDS | `lib/ai/clinical-support` | conflict surfacing + evidence citations (FR-020–FR-023) |
| Guardrails & red flags | `domain/ai/guardrails`, `domain/ai/red-flags` | pure, unit-testable (FR-005/006/011/025) |
| Context assembly | `lib/ai/context` | chart snapshot + RAG retrieval + minimization (FR-007/024/031) |
| Prompt management | `lib/ai/prompts` | draft→publish→rollback (FR-038) |
| Model management | `lib/ai/models` | per-feature config + fallback (FR-039) |
| Metering & cost | `lib/ai/metering`, `lib/ai/budgets` | usage events, budgets, caps (FR-035/036) |
| Ops & analytics | `lib/ai/ops` | dashboard aggregates, health (FR-034/037) |

## Prompt Architecture

- **DB-backed, versioned templates** (`AiPromptTemplate` + `AiPromptVersion`), keyed by feature (`PATIENT_ASSISTANT`, `SYMPTOM_CHECKER`, `DOCTOR_SOAP`, `DOCTOR_SUMMARY`, `RX_ASSIST`, `CDS`, `RECOMMENDATIONS`). Lifecycle: `DRAFT → PUBLISHED → ARCHIVED`; exactly one published version per template; publish/rollback are audited admin actions (FR-038). Seed migration ships safe defaults so the platform works before any admin edits.
- **Layered assembly** at runtime (in `lib/ai/orchestration`): (1) system safety layer — non-editable, code-owned invariants (AI identity, no-diagnosis/no-prescription rules for patients, emergency escalation instruction, locale directive); (2) published feature template from DB (admin-tunable tone/structure); (3) grounding context block (chart snapshot + retrieved KB chunks, clearly delimited and marked as data-not-instructions); (4) conversation window. Admin edits can never remove the code-owned safety layer.
- **Locale-aware**: templates store `en` and `ar` bodies; the safety layer is bilingual; responses instructed to match the user's locale (FR-041/043).
- **Traceability**: the `promptVersionId` used is stamped on every assistant message and usage event (FR-040).
- Prompt content is cached in-process with short TTL and invalidated on publish, so rollback takes effect within a minute (SC-009).

## Conversation Architecture

- **Persistence**: `AiConversation` (owner, feature, locale, title, status ACTIVE/HIDDEN) + `AiMessage` (role, content, safety annotations, promptVersionId/modelConfigId for assistant turns). Patient deletion = soft-hide (FR-003, FR-033). Strict owner scoping in every query (FR-004).
- **Context windowing**: last N turns (default 12) plus a **rolling conversation summary** column updated after each exchange once the window overflows; long histories stay usable without unbounded token growth (Edge Case: long conversations). Safety posture re-applied on every request regardless of window.
- **Streaming**: chat responses stream via `app/api/ai/chat/route.ts` (Node runtime, SSE / `ReadableStream`) because Server Actions don't stream token-by-token; the route performs identical auth/consent/guardrail/budget checks by calling the same `lib/ai` facade. Non-streaming operations (list history, rename, hide, symptom steps, drafts, admin) are Server Actions consumed through React Query.
- **Red-flag scan on every user message** before the provider call; a triggered red flag short-circuits with the emergency message (stored as a system-notice `AiMessage`) and logs a guardrail event (FR-006).
- **Isolation**: one conversation = one context; no cross-conversation or cross-patient bleed (context assembly takes `conversationId` + actor and loads only that thread).

## RAG Strategy

- **Two grounding sources, two mechanisms**:
  1. **Patient chart context — structured retrieval, not embeddings.** Reuse `buildAiChartContext` (EMR): typed, release-rule-respecting, RBAC-checked snapshot (allergies, active conditions/meds, recent diagnoses, released labs, emergency flags). Deterministic and auditable; chart PHI is **never embedded** into the vector store in v1 (smaller attack/compliance surface).
  2. **Medical knowledge base — vector retrieval.** Curated bilingual education/self-care/wellness content (`AiKnowledgeDoc` → chunked `AiKnowledgeChunk` with embeddings). Used by Health Q&A, education, recommendations, and symptom-checker guidance text.
- **Pipeline** (LangChain in `lib/ai/orchestration`): embed query → pgvector similarity search (top-k 5, locale-filtered with cross-locale fallback) → similarity threshold filter → assemble delimited context block with source titles → generate. Retrieved source titles power the explainability line (FR-024) and "learn more" citations where Stitch designs them.
- **Honest fallback**: if retrieval returns nothing above threshold, the prompt instructs the model to answer generally and say when it doesn't know (FR-008); recommendations fall back to general wellness content (FR-015).
- **Ingestion**: admin/ops seed script (`scripts/ai-ingest-kb.ts`) chunks (~800 tokens, 100 overlap), embeds, and upserts KB content; content-hash skips unchanged docs on re-runs.

## Embedding Strategy

- **Model**: OpenAI `text-embedding-3-small` (1536 dims) — strong multilingual (Arabic) performance at low cost; accessed via a new `AiEmbeddingsPort` so the model can be swapped without touching callers (stub adapter returns deterministic vectors for tests).
- **What gets embedded**: KB chunks only (v1). Patient conversations, chart data, and clinical drafts are **not** embedded (PHI minimization; chart grounding is structured per RAG strategy).
- **Chunking**: heading-aware splits ~800 tokens with 100 overlap; each chunk stores locale, source doc, title path, and content hash.
- **Versioning**: `embeddingModel` recorded per chunk; changing models triggers full re-ingestion (cheap at this corpus size) rather than mixed-space search.
- **Query embeddings** computed per request (metered like any usage), with an in-process LRU for repeated identical queries (education browsing patterns).

## Vector Database Strategy

- **pgvector on Neon** — no new infrastructure: enable `CREATE EXTENSION vector` by migration; `AiKnowledgeChunk.embedding` is `Unsupported("vector(1536)")` in Prisma; similarity search via a thin typed raw-SQL helper (`lib/ai/vector.ts`) using cosine distance.
- **Index**: HNSW (`vector_cosine_ops`) created in the migration — best recall/latency for a corpus that fits comfortably in memory; no IVFFlat training-step management.
- **Filters**: locale + doc-status filters combined in the SQL query (metadata columns on the chunk row), keeping RBAC-free KB content the only vector-searchable data.
- **Alternatives rejected** (see research.md): dedicated vector DBs (Pinecone/Qdrant) add an external PHI-adjacent dependency, another BAA surface, and ops burden for a corpus of a few thousand chunks; Neon pgvector keeps data residency, backups, and Prisma tooling unified.

## API Contracts

Full request/response shapes in [contracts/ai-api.md](./contracts/ai-api.md); UI mounting contract in [contracts/ui.md](./contracts/ui.md). Summary:

- **Server Actions** (`actions/ai/*`, all Zod-validated, returning the platform result envelope):
  - Conversations: `aiListConversations`, `aiGetConversation`, `aiStartConversation`, `aiHideConversation`, `aiRenameConversation`
  - Symptom: `aiStartSymptomSession`, `aiAnswerSymptomStep`, `aiGetSymptomSession`, `aiAttachSessionToBooking`
  - Recommendations: `aiListRecommendations`, `aiDismissRecommendation`
  - Doctor: `aiGenerateSoapDraft`, `aiGenerateConsultationSummary`, `aiSuggestPrescription`, `aiListCdsInsights`, `aiDismissCdsInsight`, `aiAcceptDraft` (bridges into EMR flows with the human actor)
  - Feedback: `aiSubmitFeedback`
  - Admin: `aiAdminGetOpsDashboard`, `aiAdminListUsage`, `aiAdminListPromptTemplates`, `aiAdminSavePromptDraft`, `aiAdminPublishPrompt`, `aiAdminRollbackPrompt`, `aiAdminListModelConfigs`, `aiAdminSaveModelConfig`, `aiAdminSaveBudget`, `aiAdminGetGuardrailEvents`
- **Route handler**: `POST /api/ai/chat` — SSE stream (`token`, `notice`, `done`, `error` events); auth via session; same facade guards as actions; used by the streaming chat hook only.
- **Result codes**: platform taxonomy plus `BUDGET_EXHAUSTED` and `CONSENT_REQUIRED` (mapped to the friendly unavailable / consent states per Stitch).

## Model Management

- **`AiModelConfig`** per feature: provider (`OPENAI` | `STUB`), model name, params (temperature, maxOutputTokens), fallback model, active flag, version counter. Admin edits are versioned + audited (FR-039); a seed migration provides defaults (e.g., `gpt-4o-mini` for patient chat/education, `gpt-4o` for clinical documentation/Rx assist).
- **Resolution & fallback**: `lib/ai/models.ts` resolves feature → active config (short-TTL cached); on primary-model provider error the orchestration retries once with the fallback model, then returns `DEPENDENCY_UNAVAILABLE` → graceful degraded UI (FR-027).
- **Traceability**: `modelConfigId` (+ version) stamped on assistant messages and usage events (FR-040).
- **BAA gate preserved**: the existing `assertBaaGate()` remains in front of every provider call — non-stub providers in production require `PLATFORM_AI_BAA_SATISFIED=true`.

## Security Strategy

- **RBAC on every entry point**: patient actions assert self-ownership; doctor actions assert care relationship via `assertEmrAccess` (FR-023/029); admin actions assert ADMIN role; denials audited. The streaming route enforces the identical checks (no side door).
- **Consent gating**: personalized grounding requires the data-use consent (reuse EMR `requireConsent` with the `DATA_SHARING` type); withdrawn → general non-personalized mode, never an error wall (FR-030). Consent state checked at context-assembly time, fail-closed to non-personalized.
- **PHI minimization**: chart context is the minimum-necessary typed snapshot (existing `buildAiChartContext` limits); no chart PHI in the vector store; no message content in usage/guardrail/ops records (FR-028); notifications carry only "you have a response" copy; `lib/platform/redact.ts` applied to anything ops-visible.
- **Prompt-injection defenses**: user content and retrieved chunks are delimited and declared as data; code-owned safety layer cannot be edited by admins; pre-flight heuristic scan (instruction-override patterns) logs `AiGuardrailEvent` and hardens the system message; post-generation output policy strips/blocks diagnosis-or-prescription phrasing to patients (FR-005/025).
- **Autonomy bans enforced structurally**: no code path exists from AI output to EMR mutation without a clinician-actor Server Action (`aiAcceptDraft` requires the doctor actor and routes through existing EMR draft flows; signing stays in EMR with its password re-auth) (FR-017/045).
- **Audit**: append-only events for conversation create/hide, AI chart-context access (already audited in EMR facade), draft generate/accept/discard, guardrail triggers, admin prompt/model/budget changes, denials (FR-032).
- **Secrets & transport**: `OPENAI_API_KEY` server-only env; HTTPS everywhere; no client-side provider calls ever.

## Monitoring Strategy

- **`AiUsageEvent` per interaction**: feature, role, locale, modelConfig/promptVersion ids, token counts (prompt/completion), latency ms, outcome (SUCCESS/ERROR/REFUSED/RED_FLAG/BUDGET_BLOCKED), estimated cost — **no content** (FR-035). Written asynchronously after response completion (stream close) so metering never blocks UX.
- **`AiGuardrailEvent`**: trigger type (RED_FLAG, INJECTION, OUTPUT_POLICY, CONSENT_BLOCK), feature, timestamp, minimal category metadata (FR-025).
- **Ops dashboard** (`lib/ai/ops`): period-scoped aggregates — usage by feature/role/locale, latency p50/p95, error and refusal rates, feedback ratios, cost vs budget — computed with indexed SQL aggregates over the events tables (rollup materialization deferred until volume demands it) (FR-034/037).
- **Alerts**: budget threshold/hard-cap breaches and error-rate spikes notify admins via Platform notifications (FR-036); health signal exposed through the existing `lib/platform/health.ts` pattern.
- **Feedback loop**: `AiFeedback` (rating/flag per message) feeds the dashboard quality panel (FR-026).

## Cost Optimization

- **Metering + budgets first-class**: `AiCostBudget` (scope: global or per-feature; period: monthly; amount, alert threshold %, hard-cap flag). Budget check runs **pre-provider**; hard cap → `BUDGET_EXHAUSTED` friendly state, clinical manual flows untouched (FR-036, Edge Case: budget exhausted).
- **Model routing**: cheap fast model for high-volume patient chat/education; premium model only where clinical quality demands (doctor documentation, Rx assist) — admin-tunable via model configs.
- **Token discipline**: conversation windowing + rolling summaries cap prompt growth; chart context is a compact typed snapshot, not raw records; KB top-k small (5) with threshold cutoff; `maxOutputTokens` bounded per feature.
- **Caching**: published prompt + model config in-process TTL cache; query-embedding LRU; education/recommendation content cacheable per (patient, day) where personalization inputs are unchanged.
- **Rate limiting**: per-user per-feature limits (reuse platform rate-limit pattern; e.g., patient chat 30 msgs/hour) to bound abuse-driven spend, with the existing friendly rate-limited state.
- **Cost attribution**: estimated cost computed from model pricing table at event-write time; daily-level reconciliation acceptable per spec assumption.

## Performance Strategy

- **Streaming-first UX**: patient chat and doctor drafts stream tokens (SSE) so perceived latency ≈ first-token time; targets SC-001 (p95 first render < 15s, typical < 3s).
- **Parallel context assembly**: chart snapshot, consent check, KB retrieval, and prompt/model resolution run concurrently (`Promise.all`) before the provider call; retrieval budget < 500ms p95 (HNSW + small corpus).
- **Non-blocking bookkeeping**: usage events, audit writes, and rolling-summary updates happen after the response is committed (fire-and-forget with error logging), never in the hot path.
- **React Query**: history/lists/dashboards use stale-while-revalidate with keys per `(feature, patientUserId, period)`; streaming hook appends to the query cache on completion so history is instantly consistent.
- **Dashboard**: indexed aggregates on `AiUsageEvent(createdAt, feature)`; date-bucketed queries; 60s client cache — SC-008 (< 1 min to insight) with headroom.
- **Degradation**: provider timeout budget (30s hard) with fallback-model retry; timeouts produce a resumable "assistant unavailable" message rather than a hung stream (FR-027/SC-010).

## Folder Structure

### Documentation (this feature)

```text
specs/008-ai-healthcare-platform/
├── plan.md                 # this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ai-api.md
│   └── ui.md
└── tasks.md                # /speckit-tasks (not this command)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma           # + AI models (see data-model.md)
└── migrations/…            # pgvector extension + HNSW index + seeds

scripts/
└── ai-ingest-kb.ts         # KB chunk/embed/upsert (idempotent)

src/
├── domain/ai/
│   ├── access.ts           # actor/feature access rules (wraps EMR care-relationship)
│   ├── red-flags.ts        # emergency pattern detection (en/ar), pure
│   ├── guardrails.ts       # injection heuristics + output policy, pure
│   ├── prompt-lifecycle.ts # draft→publish→rollback state rules, pure
│   ├── budget.ts           # threshold/hard-cap math, pure
│   └── context-policy.ts   # minimization + consent-mode rules, pure
├── lib/ai/
│   ├── conversations.ts    # chat turns, history, windowing, rolling summary
│   ├── symptom.ts          # session state machine + triage outcome
│   ├── recommendations.ts  # personalized + general wellness
│   ├── drafts.ts           # SOAP/summary drafts + accept bridge to EMR
│   ├── clinical-support.ts # rx suggestions + CDS insights (evidence-cited)
│   ├── context.ts          # chart snapshot + RAG assembly + minimization
│   ├── orchestration.ts    # LangChain chains, prompt layering, streaming
│   ├── vector.ts           # typed pgvector similarity helper
│   ├── prompts.ts          # template CRUD + publish/rollback + cache
│   ├── models.ts           # model config resolution + fallback
│   ├── metering.ts         # usage events + cost estimation
│   ├── budgets.ts          # budget CRUD + pre-flight check + alerts
│   ├── ops.ts              # dashboard aggregates + health
│   ├── audit.ts            # ai.* audit event helpers
│   └── index.ts
├── ports/
│   └── ai-embeddings.ts    # AiEmbeddingsPort (new); ai-assistant.ts extended
├── adapters/
│   ├── openai-ai.ts        # OpenAI SDK chat+stream adapter (new)
│   ├── openai-embeddings.ts# embeddings adapter (new)
│   └── stub-ai.ts          # extended for streaming + embeddings determinism
├── actions/ai/
│   ├── _actor.ts           # resolve actor (mirror actions/emr/_actor.ts)
│   ├── conversations.ts · symptom.ts · recommendations.ts
│   ├── drafts.ts · clinical-support.ts · feedback.ts
│   └── admin.ts
├── app/
│   ├── api/ai/chat/route.ts            # SSE streaming endpoint
│   └── [locale]/
│       ├── patient/ai/…                # assistant, history, symptom checker,
│       │                               # education/recommendations (Stitch)
│       ├── doctor/…                    # AI panels inside consultation
│       │                               # workspace + chart + Rx compose (Stitch)
│       └── admin/ai/…                  # ops dashboard, prompts, models,
│                                       # budgets, monitoring (Stitch)
├── components/ai/
│   ├── chat/ (assistant-chat, message-bubble, disclaimer, emergency-banner)
│   ├── symptom/ (session-wizard, outcome-card)
│   ├── recommendations/ (recommendation-card, education-list)
│   ├── doctor/ (draft-panel, rx-suggest-panel, cds-insights)
│   ├── admin/ (ops-dashboard, usage-charts, prompt-editor, model-config-form,
│   │           budget-form, guardrail-log)
│   ├── feedback/ (response-feedback)
│   └── index.ts
└── hooks/ai/
    ├── use-ai-chat.ts      # SSE streaming hook (append-to-cache on done)
    ├── use-ai-conversations.ts · use-symptom-session.ts
    └── use-ai-admin.ts

tests/
├── unit/ai/        # red-flags, guardrails, prompt lifecycle, budget math,
│                   # context policy, i18n keys
├── security/ai/    # RBAC matrix, consent gating, ownership scoping
├── integration/ai/ # chat flow (stub adapter), symptom flow, drafts→EMR
│                   # accept bridge, prompt publish/rollback, metering
└── e2e/ai/         # smoke per role (Playwright)
```

**Structure Decision**: Same layered pattern as Module 6 EMR (domain → lib facades → actions → components), plus one streaming route handler as the sole non-action entry point. LangChain and the OpenAI SDK are quarantined to `adapters/` + `lib/ai/orchestration.ts` behind ports, keeping the domain pure and tests deterministic via the stub adapter.

## Complexity Tracking

No constitution violations to justify. The only additions beyond established patterns are (1) the SSE route handler — required because Server Actions cannot stream tokens, and (2) pgvector raw-SQL helper — required because Prisma lacks native vector query support; both are minimal and isolated.
