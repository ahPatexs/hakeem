/**
 * Idempotent KB ingest: chunk published AiKnowledgeDoc rows, embed, upsert chunks.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/ai-ingest-kb.ts
 *   npx tsx --env-file=.env scripts/ai-ingest-kb.ts --all
 */
import { createHash, randomBytes } from "node:crypto";
import { getEmbeddingsAdapter } from "../src/adapters";
import { prisma } from "../src/lib/prisma";

const TARGET_CHARS = 3200; // ~800 tokens @ ~4 chars/token
const OVERLAP_CHARS = 400; // ~100 tokens

function contentHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Heading-aware splitter (~800 tokens / 100 overlap) without LangChain dependency. */
function chunkDocument(content: string): string[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const sections = normalized.split(/(?=^#{1,3}\s+.+$)/m).map((s) => s.trim()).filter(Boolean);
  const pieces = sections.length ? sections : [normalized];
  const chunks: string[] = [];

  for (const piece of pieces) {
    if (piece.length <= TARGET_CHARS) {
      chunks.push(piece);
      continue;
    }
    let start = 0;
    while (start < piece.length) {
      const end = Math.min(start + TARGET_CHARS, piece.length);
      chunks.push(piece.slice(start, end).trim());
      if (end >= piece.length) break;
      start = Math.max(0, end - OVERLAP_CHARS);
    }
  }

  return chunks.filter(Boolean);
}

function parseArgs(argv: string[]) {
  return { forceAll: argv.includes("--all") };
}

async function upsertChunks(
  docId: string,
  locale: "EN" | "AR",
  chunks: string[],
  embeddings: number[][],
  embeddingModel: string,
) {
  // Replace existing chunks for this doc (ordinals rewrite)
  await prisma.aiKnowledgeChunk.deleteMany({ where: { docId } });

  for (let i = 0; i < chunks.length; i++) {
    const embedding = embeddings[i];
    if (!embedding?.length) continue;
    const literal = `[${embedding.join(",")}]`;
    const id = `kbc_${randomBytes(12).toString("hex")}`;
    await prisma.$executeRaw`
      INSERT INTO "AiKnowledgeChunk" (id, "docId", ordinal, content, locale, "embeddingModel", embedding, "createdAt")
      VALUES (
        ${id},
        ${docId},
        ${i},
        ${chunks[i]},
        ${locale}::"LocaleCode",
        ${embeddingModel},
        ${literal}::vector,
        NOW()
      )
    `;
  }
}

async function main() {
  const { forceAll } = parseArgs(process.argv.slice(2));
  const embedder = getEmbeddingsAdapter();
  const docs = await prisma.aiKnowledgeDoc.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { slug: "asc" },
  });

  console.info(`[ai-ingest-kb] ${docs.length} published docs (forceAll=${forceAll})`);

  let ingested = 0;
  let skipped = 0;

  for (const doc of docs) {
    const hash = contentHash(doc.content);
    if (!forceAll && doc.contentHash === hash) {
      const existing = await prisma.aiKnowledgeChunk.count({ where: { docId: doc.id } });
      if (existing > 0) {
        skipped += 1;
        continue;
      }
    }

    if (doc.contentHash !== hash) {
      await prisma.aiKnowledgeDoc.update({
        where: { id: doc.id },
        data: { contentHash: hash },
      });
    }

    const chunks = chunkDocument(doc.content);
    if (!chunks.length) {
      skipped += 1;
      continue;
    }

    const embeddings = await embedder.embed(chunks);
    await upsertChunks(doc.id, doc.locale, chunks, embeddings, embedder.model);
    ingested += 1;
    console.info(`[ai-ingest-kb] ingested ${doc.slug} (${chunks.length} chunks)`);
  }

  console.info(`[ai-ingest-kb] done ingested=${ingested} skipped=${skipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
