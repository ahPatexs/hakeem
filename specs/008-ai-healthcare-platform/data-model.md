# Data Model: AI Healthcare Platform (Module 7)

**Date**: 2026-08-04 · **Plan**: [plan.md](./plan.md) · All models extend `prisma/schema.prisma`. Conventions follow Modules 2–6: cuid ids, `createdAt`/`updatedAt`, soft-hide via status/`deletedAt`, relations to `User` by id.

## Enums

```prisma
enum AiFeatureKey {
  PATIENT_ASSISTANT
  SYMPTOM_CHECKER
  RECOMMENDATIONS
  DOCTOR_SOAP
  DOCTOR_SUMMARY
  RX_ASSIST
  CDS
}

enum AiConversationStatus { ACTIVE HIDDEN }

enum AiMessageRole { USER ASSISTANT SYSTEM_NOTICE }

enum AiSymptomOutcome { SELF_CARE SEE_DOCTOR URGENT EMERGENCY }

enum AiSymptomSessionStatus { IN_PROGRESS COMPLETED ABANDONED }

enum AiDraftKind { SOAP CONSULT_SUMMARY RX_SUGGESTION }

enum AiDraftStatus { PENDING ACCEPTED DISCARDED }

enum AiPromptStatus { DRAFT PUBLISHED ARCHIVED }

enum AiProviderKind { OPENAI STUB }

enum AiUsageOutcome { SUCCESS ERROR REFUSED RED_FLAG BUDGET_BLOCKED RATE_LIMITED }

enum AiGuardrailTrigger { RED_FLAG INJECTION OUTPUT_POLICY CONSENT_BLOCK }

enum AiBudgetScope { GLOBAL FEATURE }

enum AiFeedbackRating { HELPFUL NOT_HELPFUL FLAGGED }

enum AiRecommendationStatus { ACTIVE DISMISSED }
```

## Conversations

```prisma
model AiConversation {
  id             String               @id @default(cuid())
  ownerUserId    String
  feature        AiFeatureKey
  locale         LocaleCode
  title          String?
  status         AiConversationStatus @default(ACTIVE)
  rollingSummary String?              // windowing summary; no separate PHI class
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt

  owner    User        @relation(fields: [ownerUserId], references: [id])
  messages AiMessage[]

  @@index([ownerUserId, status, updatedAt])
}

model AiMessage {
  id              String        @id @default(cuid())
  conversationId  String
  role            AiMessageRole
  content         String
  // safety + traceability annotations (assistant/system turns)
  redFlagged      Boolean       @default(false)
  disclaimerShown Boolean       @default(false)
  promptVersionId String?
  modelConfigId   String?
  createdAt       DateTime      @default(now())

  conversation AiConversation   @relation(fields: [conversationId], references: [id])
  promptVersion AiPromptVersion? @relation(fields: [promptVersionId], references: [id])
  modelConfig   AiModelConfig?   @relation(fields: [modelConfigId], references: [id])
  feedback      AiFeedback[]

  @@index([conversationId, createdAt])
}
```

**Rules**: every query scoped by `ownerUserId` (FR-004). Patient delete ⇒ `status: HIDDEN` (FR-003/033). Assistant turns MUST carry `promptVersionId` + `modelConfigId` (FR-040).

## Symptom checker

```prisma
model AiSymptomSession {
  id            String                 @id @default(cuid())
  patientUserId String
  locale        LocaleCode
  status        AiSymptomSessionStatus @default(IN_PROGRESS)
  steps         Json                   // ordered [{question, answer, at}]
  outcome       AiSymptomOutcome?
  rationale     String?                // plain-language explanation
  redFlagged    Boolean                @default(false)
  appointmentId String?                // set when attached to a booking (FR-012)
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt

  patient     User         @relation(fields: [patientUserId], references: [id])
  appointment Appointment? @relation(fields: [appointmentId], references: [id])

  @@index([patientUserId, createdAt])
}
```

**Rules**: outcome may only be escalated (never downgraded) by the deterministic red-flag layer (research R9). Completed sessions immutable except `appointmentId` attachment.

## Recommendations

```prisma
model AiRecommendation {
  id            String                 @id @default(cuid())
  patientUserId String
  locale        LocaleCode
  title         String
  body          String
  reason        String                 // plain-language "why shown" (FR-013)
  sourceKinds   String[]               // data categories used, e.g. ["conditions"]
  status        AiRecommendationStatus @default(ACTIVE)
  createdAt     DateTime               @default(now())
  updatedAt     DateTime               @updatedAt

  patient User @relation(fields: [patientUserId], references: [id])

  @@index([patientUserId, status])
}
```

**Rules**: `reason`/`sourceKinds` may reference only patient-visible data (FR-013). Dismissal persists (FR-014).

## Clinical drafts (doctor AI)

```prisma
model AiDraftArtifact {
  id             String        @id @default(cuid())
  kind           AiDraftKind
  doctorUserId   String
  patientUserId  String
  appointmentId  String?
  content        Json          // kind-shaped payload (SOAP fields / summary body / rx fields)
  evidence       Json          // cited context categories + KB source titles (FR-024)
  conflicts      Json?         // allergy/interaction flags for RX_SUGGESTION (FR-021)
  status         AiDraftStatus @default(PENDING)
  acceptedIntoId String?       // resulting EMR artifact id after accept (FR-018)
  promptVersionId String?
  modelConfigId   String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  doctor      User         @relation("AiDraftDoctor", fields: [doctorUserId], references: [id])
  patient     User         @relation("AiDraftPatient", fields: [patientUserId], references: [id])
  appointment Appointment? @relation(fields: [appointmentId], references: [id])

  @@index([doctorUserId, status, createdAt])
  @@index([patientUserId, kind])
}
```

**Rules**: PENDING drafts invisible to patients (FR-017). Accept requires the doctor actor + care relationship and routes through EMR flows which stamp `aiAssisted: true`; `acceptedIntoId` links the resulting EMR artifact (FR-018). No other write path exists (FR-045).

## Prompt management

```prisma
model AiPromptTemplate {
  id        String       @id @default(cuid())
  feature   AiFeatureKey @unique
  name      String
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  versions AiPromptVersion[]
}

model AiPromptVersion {
  id          String         @id @default(cuid())
  templateId  String
  version     Int
  bodyEn      String
  bodyAr      String
  status      AiPromptStatus @default(DRAFT)
  publishedAt DateTime?
  publishedBy String?        // admin user id
  changeNote  String?
  createdAt   DateTime       @default(now())

  template AiPromptTemplate @relation(fields: [templateId], references: [id])
  messages AiMessage[]

  @@unique([templateId, version])
  @@index([templateId, status])
}
```

**Rules**: at most one `PUBLISHED` per template (enforced in `lib/ai/prompts` transaction: publish archives the prior). Rollback = re-publish a prior version as a new version row (append-only lineage). All transitions audited (FR-038). Code-owned safety layer lives in code, composed above these bodies — not editable here.

## Model management

```prisma
model AiModelConfig {
  id            String         @id @default(cuid())
  feature       AiFeatureKey
  provider      AiProviderKind @default(STUB)
  modelName     String         // e.g. gpt-4o-mini
  fallbackModel String?
  temperature   Float          @default(0.3)
  maxOutputTokens Int          @default(1024)
  active        Boolean        @default(true)
  version       Int            @default(1)
  updatedBy     String?        // admin user id
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  messages AiMessage[]

  @@index([feature, active])
}
```

**Rules**: one active config per feature (transactionally enforced); edits bump `version` and are audited (FR-039). Provider resolution still passes the platform BAA gate.

## Metering, budgets, guardrails, feedback

```prisma
model AiUsageEvent {
  id               String         @id @default(cuid())
  feature          AiFeatureKey
  role             String         // PATIENT | DOCTOR | ADMIN
  locale           LocaleCode
  userId           String?        // attribution; content never stored
  modelConfigId    String?
  promptVersionId  String?
  promptTokens     Int            @default(0)
  completionTokens Int            @default(0)
  latencyMs        Int            @default(0)
  outcome          AiUsageOutcome
  estimatedCostUsd Decimal        @default(0) @db.Decimal(12, 6)
  createdAt        DateTime       @default(now())

  @@index([createdAt, feature])
  @@index([feature, outcome, createdAt])
}

model AiCostBudget {
  id             String        @id @default(cuid())
  scope          AiBudgetScope @default(GLOBAL)
  feature        AiFeatureKey? // required when scope = FEATURE
  monthlyUsd     Decimal       @db.Decimal(12, 2)
  alertThreshold Int           @default(80) // percent
  hardCap        Boolean       @default(false)
  breachedAt     DateTime?     // last threshold breach notification
  updatedBy      String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@unique([scope, feature])
}

model AiGuardrailEvent {
  id        String             @id @default(cuid())
  trigger   AiGuardrailTrigger
  feature   AiFeatureKey
  role      String
  category  String?            // minimal metadata; never message content
  createdAt DateTime           @default(now())

  @@index([createdAt, trigger])
}

model AiFeedback {
  id        String           @id @default(cuid())
  messageId String
  userId    String
  rating    AiFeedbackRating
  category  String?
  createdAt DateTime         @default(now())

  message AiMessage @relation(fields: [messageId], references: [id])

  @@unique([messageId, userId])
}
```

**Rules**: `AiUsageEvent`/`AiGuardrailEvent` contain **no message content** (FR-028/035). Budget check pre-provider; hard cap ⇒ `BUDGET_EXHAUSTED` (FR-036). Cost from code-maintained pricing table at write time (research R11).

## Knowledge base (RAG)

```prisma
model AiKnowledgeDoc {
  id          String   @id @default(cuid())
  slug        String   @unique
  title       String
  locale      LocaleCode
  kind        String   // education | self-care | wellness
  status      String   @default("PUBLISHED") // PUBLISHED | RETIRED
  contentHash String   // idempotent re-ingestion
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  chunks AiKnowledgeChunk[]
}

model AiKnowledgeChunk {
  id             String                       @id @default(cuid())
  docId          String
  ordinal        Int
  content        String
  locale         LocaleCode
  embeddingModel String                       // e.g. text-embedding-3-small
  embedding      Unsupported("vector(1536)")?
  createdAt      DateTime                     @default(now())

  doc AiKnowledgeDoc @relation(fields: [docId], references: [id])

  @@unique([docId, ordinal])
}
```

**Migration notes** (raw SQL in the module migration):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX ai_knowledge_chunk_embedding_hnsw
  ON "AiKnowledgeChunk" USING hnsw (embedding vector_cosine_ops);
```

**Rules**: KB contains curated, non-patient content only — no PHI ever enters the vector space (research R5). Locale-filtered search with cross-locale fallback.

## Relationships to existing modules

| Existing | Used by | How |
|---|---|---|
| `User` | all AI models | owner/actor relations |
| `Appointment` | `AiSymptomSession`, `AiDraftArtifact` | booking attachment; encounter scoping |
| EMR chart entities | context assembly only | via `buildAiChartContext` — no direct FK coupling |
| `SoapNote`, `Prescription` | draft accept bridge | `acceptedIntoId` (string ref, no FK across module boundary) |
| `ConsentType`/`ConsentEvent` | consent gating | `requireConsent(actor, { typeCode: "DATA_SHARING" })` |
| Platform audit | all sensitive actions | `ai.*` audit event types appended |

## State transitions

- **Conversation**: `ACTIVE ⇄ (rename/title) → HIDDEN` (patient hide; no un-hide in v1 UI).
- **Symptom session**: `IN_PROGRESS → COMPLETED` (outcome set) or `→ ABANDONED` (TTL job); red flag can force `COMPLETED/EMERGENCY` early.
- **Draft**: `PENDING → ACCEPTED (acceptedIntoId set)` or `→ DISCARDED`; never `ACCEPTED → *`.
- **Prompt version**: `DRAFT → PUBLISHED (archives prior published) → ARCHIVED`; rollback appends a new version cloned from an archived one.
- **Budget**: threshold breach sets `breachedAt` + notifies; month rollover clears breach state (computed, not stored per month).
