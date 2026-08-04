-- FR-024: persist explainability evidence on assistant messages
ALTER TABLE "AiMessage" ADD COLUMN IF NOT EXISTS "evidence" JSONB;
