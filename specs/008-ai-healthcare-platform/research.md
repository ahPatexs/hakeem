# Research: AI Healthcare Platform (Module 7)

**Date**: 2026-08-04 · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

All Technical Context unknowns resolved. Each decision: what / why / alternatives.

## R1. Provider integration pattern

- **Decision**: OpenAI SDK behind the existing `AiAssistantPort` (extended with streaming) plus a new `AiEmbeddingsPort`; `stub-ai` adapter remains the default in dev/CI and the production fallback behind the existing BAA gate (`assertBaaGate` in `src/lib/platform/ai.ts`).
- **Rationale**: The repo already established the ports/adapters seam and a BAA env gate for AI in Module 6 platform services. Extending it keeps every provider call auditable, swappable, and test-deterministic; no PHI reaches OpenAI unless `PLATFORM_AI_BAA_SATISFIED=true` in production.
- **Alternatives considered**: Calling the OpenAI SDK directly from `lib/ai` (rejected: breaks the established port seam, makes CI nondeterministic); Vercel AI SDK as the abstraction (rejected: mandated stack names OpenAI SDK + LangChain; adding a third abstraction layer is redundant).

## R2. LangChain's role and containment

- **Decision**: Use LangChain (`langchain`, `@langchain/openai`) only inside `lib/ai/orchestration.ts` and the ingestion script — for prompt templating/layering, the RAG chain (retriever → context block → generation), text splitting, and streaming callbacks. Domain (`domain/ai/*`) and actions never import LangChain types.
- **Rationale**: LangChain accelerates chain assembly and chunking but is a fast-moving dependency; quarantining it means guardrails, red-flag logic, budget math, and lifecycle rules stay pure TypeScript with plain unit tests, and LangChain could be removed without touching the domain.
- **Alternatives considered**: Hand-rolled orchestration (viable but re-implements splitters/retriever plumbing); LangGraph agents (rejected: v1 has no multi-step autonomous tool use — the spec forbids autonomous actions).

## R3. Streaming transport

- **Decision**: One route handler `POST /api/ai/chat` returning an SSE `ReadableStream` for patient chat and doctor draft generation; everything else is Server Actions + React Query.
- **Rationale**: Next.js Server Actions cannot stream partial tokens; a route handler is the idiomatic App Router answer. SSE (vs WebSocket) needs no connection infra on Vercel and degrades cleanly. The route calls the same `lib/ai` facade with the same actor/consent/guardrail/budget checks, so there is no privileged side door.
- **Alternatives considered**: No streaming, spinner-only (rejected: fails SC-001 perceived-latency and Stitch chat UX); WebSockets (rejected: infra overhead, no bidirectional need); `experimental_streamAction` patterns (rejected: unstable).

## R4. Vector store

- **Decision**: pgvector extension on the existing Neon PostgreSQL, HNSW cosine index, embeddings column via Prisma `Unsupported("vector(1536)")`, thin typed raw-SQL search helper.
- **Rationale**: Corpus is small (thousands of chunks); Neon supports pgvector natively; keeps data in the same store as everything else (one backup/residency/compliance story, no new vendor), and Prisma migrations manage the DDL. HNSW avoids IVFFlat's training/list-tuning at this scale.
- **Alternatives considered**: Pinecone/Qdrant/Weaviate (rejected: new external dependency and PHI-adjacent vendor surface for marginal gain at this corpus size); embedding-free keyword search (rejected: poor Arabic/English cross-lingual recall for health Q&A).

## R5. Embedding model & policy

- **Decision**: `text-embedding-3-small` (1536 dims) for KB chunks and queries; embed **knowledge-base content only** — never patient messages, chart data, or drafts in v1. Model name recorded per chunk; model change ⇒ full re-ingest.
- **Rationale**: Strong multilingual performance (Arabic) at ~1/6 the cost of `-3-large`; KB-only embedding keeps PHI out of the vector space entirely, simplifying the privacy review. Full re-ingest is minutes of work at this corpus size, avoiding mixed-space search bugs.
- **Alternatives considered**: `text-embedding-3-large` (rejected: cost without measured need); embedding patient history for semantic recall (rejected v1: PHI-in-vector-store risk vs. limited benefit — structured chart snapshot already covers grounding).

## R6. Patient chart grounding

- **Decision**: Reuse Module 6's `buildAiChartContext` (EMR) as the sole chart-grounding source: typed, RBAC-checked (`assertEmrAccess`), release-rule-respecting, audited snapshot. Patient-facing AI receives only patient-visible data; doctor-facing AI receives the clinician snapshot for care-relationship patients.
- **Rationale**: FR-031 requires AI to respect the exact release rules of the portal; the EMR facade already encodes them and audits access. Deterministic structured context also powers explainability ("based on your documented allergies…") better than retrieved fragments.
- **Alternatives considered**: Direct Prisma reads from `lib/ai` (rejected: duplicates RBAC/release logic — the exact anti-pattern Module 6 eliminated); RAG over embedded chart (rejected per R5).

## R7. Red-flag & guardrail approach

- **Decision**: Layered: (1) deterministic bilingual red-flag lexicon/pattern scan (`domain/ai/red-flags.ts`) on every patient message — pure, unit-tested, fail-safe; (2) system-prompt safety layer instructing escalation and forbidding diagnosis/prescription; (3) post-generation output policy check for patient-facing responses; (4) injection heuristics pre-provider. All triggers log `AiGuardrailEvent`.
- **Rationale**: SC-003 demands 100% red-flag escalation in tests — only a deterministic layer can guarantee that; model-level instructions alone are not testable to 100%. Layering matches the fail-closed posture of the EMR module.
- **Alternatives considered**: LLM-based moderation call per message (kept as optional future enhancement; adds latency/cost and is nondeterministic); OpenAI moderation endpoint only (rejected as sole mechanism: tuned for content policy, not clinical red flags, weak Arabic clinical coverage).

## R8. Prompt management model

- **Decision**: DB-backed `AiPromptTemplate`/`AiPromptVersion` with draft→publish→archive lifecycle, one published version per template, code-owned non-editable safety layer composed above the DB template, seed defaults in migration, short-TTL cache invalidated on publish.
- **Rationale**: FR-038 requires admin-editable versioned prompts with rollback and no code deploys; the layered composition guarantees admin edits can't remove safety invariants (defense against well-meaning prompt edits weakening guardrails).
- **Alternatives considered**: Prompts in code only (rejected: fails FR-038); external prompt-management SaaS (rejected: new vendor, overkill).

## R9. Symptom checker interaction model

- **Decision**: Server-driven session state machine (`AiSymptomSession` with steps stored as structured Q&A) where the LLM proposes the next clarifying question and the final guidance outcome, but the outcome classification (SELF_CARE / SEE_DOCTOR / URGENT / EMERGENCY) is validated against the deterministic red-flag layer, which can only escalate, never downgrade.
- **Rationale**: Combines conversational flexibility with the testable guarantee that red flags always produce emergency guidance (FR-011/SC-003); persisting structured steps enables the bookable session summary (FR-012).
- **Alternatives considered**: Pure decision-tree (rejected: brittle authoring burden, poor free-text intake); pure LLM triage (rejected: can't guarantee SC-003).

## R10. Draft-to-EMR bridge

- **Decision**: AI drafts live in `AiDraftArtifact`; `aiAcceptDraft` (doctor actor) copies accepted content into the existing EMR draft flows (`saveSoapDraft` / clinical summary / prescription draft), which stamp `aiAssisted: true` — signing remains exclusively the EMR flow with password re-auth.
- **Rationale**: FR-017/FR-018/FR-045 and the EMR module's established rule (AI never signs; `aiAssisted` flag already exists on SOAP/prescription models). Structural enforcement (no AI code path can write the chart) beats policy enforcement.
- **Alternatives considered**: AI writing EMR drafts directly (rejected: violates single-writer discipline and blurs the audit story).

## R11. Metering, budgets, ops aggregates

- **Decision**: Per-interaction `AiUsageEvent` (no content) with token counts and estimated cost from a code-maintained pricing table; `AiCostBudget` checked pre-provider (threshold alert via Platform notifications, hard cap → `BUDGET_EXHAUSTED`); dashboard uses indexed SQL aggregates directly (no rollup tables in v1).
- **Rationale**: Meets FR-034–FR-037 and SC-008 with the simplest correct design; ambulatory volumes make direct aggregates cheap; daily-level provider-invoice reconciliation is explicitly acceptable per spec assumption.
- **Alternatives considered**: Rollup/materialized tables (deferred: add when volume demands); third-party LLM-observability SaaS (Langfuse/Helicone — rejected v1: new vendor + PHI-adjacent traffic; tables keep it in-house).

## R12. Rate limiting & abuse control

- **Decision**: Reuse the platform rate-limit pattern per user per feature (e.g., patient chat 30 messages/hour, symptom sessions 10/day, doctor generation 60/hour), returning the existing friendly `RATE_LIMITED` state.
- **Rationale**: Bounds abuse-driven spend (complements budgets), consistent with existing portal UX for rate limits.
- **Alternatives considered**: Global-only limits (rejected: one abuser exhausts shared budget); no limits (rejected: unbounded cost risk).

## R13. Localization of AI output

- **Decision**: Locale directive in the safety layer (respond in the user's locale; handle mixed-language input), bilingual prompt template bodies, KB chunks tagged by locale with cross-locale fallback retrieval, UI strings via `next-intl` with en/ar parity test extended to `ai.*`.
- **Rationale**: FR-041/043 and SC-011; model-generated Arabic quality with GPT-4-class models is production-acceptable; deterministic UI copy stays in message catalogs where parity is enforceable.
- **Alternatives considered**: Post-hoc machine translation of English answers (rejected: quality/latency/cost, loses medical nuance).

## R14. New outcome codes

- **Decision**: Extend the platform result taxonomy with `BUDGET_EXHAUSTED` and `CONSENT_REQUIRED` (AI-scoped), mapped to friendly Stitch states; all other codes reuse the existing taxonomy.
- **Rationale**: FR-027/FR-030 need distinguishable UX states (unavailable-by-budget vs consent prompt vs provider outage) without overloading `FORBIDDEN`.
- **Alternatives considered**: Overloading existing codes (rejected: UI can't differentiate the required states).
