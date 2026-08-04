# Quickstart: AI Healthcare Platform (Module 7)

Validation/run guide. Contracts: [contracts/ai-api.md](./contracts/ai-api.md) · Data: [data-model.md](./data-model.md).

## Prerequisites

- Node 20, repo deps installed (`npm install` — adds `openai`, `langchain`, `@langchain/openai`)
- Neon/PostgreSQL with the pgvector extension available (`CREATE EXTENSION vector` runs in the module migration)
- `.env`:
  - `AI_ASSISTANT_PROVIDER=stub` (default — deterministic, no key needed) or `openai`
  - `OPENAI_API_KEY=…` (only when provider is `openai`)
  - `PLATFORM_AI_BAA_SATISFIED=true` required before a non-stub provider works in production (existing gate)

## Setup

```bash
npx prisma migrate dev        # applies AI models + vector extension + HNSW index + seeds
npx prisma db seed            # demo users + AI prompt/model defaults + sample KB docs
npx tsx scripts/ai-ingest-kb.ts   # chunk + embed knowledge base (no-op deltas on re-run)
npm run dev
```

Seeds provide: published prompt versions per feature, default model configs (stub provider), a global budget, and a handful of bilingual education docs so RAG returns results.

## Validation scenarios

### 1. Patient assistant + history (US1)

1. Log in as the demo patient → `patient/ai`.
2. Send an English question → streamed answer renders with AI identity + disclaimer.
3. Send an Arabic question → Arabic RTL answer.
4. Ask "prescribe me antibiotics" → refusal + guidance to book a consultation.
5. Reload → both conversations in history; reopen and continue one; hide one and confirm it disappears from the list.

Expected: no other user's conversations ever visible; every assistant message row has `promptVersionId`/`modelConfigId` set.

### 2. Red-flag escalation (US1/US3)

1. In chat, send "crushing chest pain and I can't breathe".
2. Expected: emergency guidance banner **before any other content**; no provider call for that turn (stub logs confirm); `AiGuardrailEvent(RED_FLAG)` row created.
3. Repeat inside a symptom-checker session → outcome forced to `EMERGENCY`.

### 3. Symptom checker (US3)

1. `patient/ai/symptom-checker` → describe a mild complaint → answer clarifying questions → guidance outcome (`SELF_CARE`/`SEE_DOCTOR`) with rationale + non-diagnostic disclaimer.
2. Attach the completed session to a bookable appointment → doctor sees the session summary as pre-visit context.

### 4. Doctor documentation drafts (US2)

1. Log in as the demo doctor → open an in-progress consultation → AI panel → generate SOAP draft.
2. Expected: draft labeled AI-assisted; accept → EMR SOAP draft form populated; sign via the normal flow → signed note carries `aiAssisted: true`.
3. Kill the provider (set stub adapter to fail mode) → generation shows friendly unavailable; manual SOAP flow unaffected.

### 5. Rx assistance conflicts (US4)

1. Demo patient has a seeded Penicillin allergy. As the doctor, request an antibiotic suggestion.
2. Expected: conflict flag citing the documented allergy shown **before** accept; accepting still routes through the existing prescription draft + safety-check sign flow.

### 6. Consent gating

1. As the patient, withdraw the `DATA_SHARING` consent.
2. Expected: assistant switches to general (non-personalized) mode with the consent notice; no chart context in prompts (stub adapter logs prove absence); re-consent restores personalization.

### 7. Admin ops, prompts, models, budgets (US5/US6)

1. Log in as admin → `admin/ai`: usage/cost/latency/guardrail metrics render for the selected period; drill into usage with feature/role/locale filters — totals reconcile.
2. `admin/ai/prompts`: edit the patient-assistant template as draft → publish → new chats use it (visible tone change); rollback → prior behavior restored within a minute; audit rows for both.
3. `admin/ai/models`: switch a feature's model config → next responses stamp the new `modelConfigId`.
4. `admin/ai/budgets`: set a tiny monthly hard-cap budget → exhaust it (few stub messages with nonzero cost table) → chat shows friendly unavailable (`BUDGET_EXHAUSTED`), manual flows fine; admin notified at threshold.
5. As doctor/patient, attempt any `admin/ai/*` route → denied + audited.

### 8. RBAC/security matrix

```bash
npx vitest run tests/security/ai
```

Expected: patient cannot read another's conversations/sessions/recommendations; doctor without care relationship gets no AI context and no drafts; non-admin denied on all admin actions; streaming route enforces identical guards.

## Test commands

```bash
npx tsc --noEmit                      # strict typecheck
npx vitest run tests/unit/ai          # red-flags, guardrails, prompt lifecycle, budget math, context policy, i18n keys
npx vitest run tests/security/ai      # RBAC + consent matrix
npx vitest run tests/integration/ai   # chat/symptom/draft flows against stub adapter
npx playwright test tests/e2e/ai      # role smoke (requires E2E_* auth env vars)
```

## Non-functional spot checks

- **SC-001**: first streamed token < 3s typical with stub; with OpenAI, p95 first render < 15s.
- **SC-008**: dashboard answers spend-by-feature within one screen load.
- **SC-010**: with provider failing, documentation/prescribing/booking all remain usable.
- **SC-011**: switch locale to Arabic — all AI surfaces RTL; i18n parity test green.

## Notes

- KB re-ingestion is idempotent (content hash); changing the embedding model requires full re-ingest (`--all` flag).
- No PHI is embedded or stored in usage/guardrail events by design — verify via row inspection in scenario 7.

### Knowledge-base corpus update runbook

1. Edit or seed `AiKnowledgeDoc` rows (status `PUBLISHED`, bilingual when possible).
2. Run ingest (stub embeddings by default; set `AI_EMBEDDINGS_PROVIDER=openai` + key for production vectors):

```bash
npx tsx --env-file=.env scripts/ai-ingest-kb.ts        # delta by contentHash
npx tsx --env-file=.env scripts/ai-ingest-kb.ts --all  # force re-chunk + re-embed
```

3. Confirm chunks exist and the HNSW index is used (Neon/Postgres):

```sql
EXPLAIN ANALYZE
SELECT id FROM "AiKnowledgeChunk"
ORDER BY embedding <=> '[0,0,...]'::vector
LIMIT 5;
-- Expect an Index Scan using the HNSW index, not Seq Scan.
```

4. Cross-locale fallback: query in `ar` when only `en` chunks match (or vice versa) — `searchKnowledge` fills remaining topK from the other locale.

## Production readiness checklist (T080)

- [x] **BAA gate**: non-stub providers require `PLATFORM_AI_BAA_SATISFIED=true` (`assertBaaGate`); keep `false` until the executed BAA is on file.
- [x] **`.env.example`**: documents `AI_ASSISTANT_PROVIDER`, `AI_EMBEDDINGS_PROVIDER`, `OPENAI_API_KEY`, `AI_STUB_MODE`, `PLATFORM_AI_BAA_SATISFIED`.
- [x] **Budgets**: seed installs a GLOBAL `AiCostBudget`; admin UI at `admin/ai/budgets` for hard caps / alert thresholds.
- [x] **Rate limits**: per-user per-feature limits in `lib/ai/rate-limit` (e.g. patient chat 30/hour).
- [x] **No content in metering**: `AiUsageEvent` / `AiGuardrailEvent` store feature/role/outcome/latency/tokens/cost/trigger/category only — never message bodies (inspect rows after scenario 7).
- [x] **Graceful degradation**: `AI_STUB_MODE=fail` (or real provider outage) returns friendly unavailable; EMR SOAP / Rx / booking remain usable.
