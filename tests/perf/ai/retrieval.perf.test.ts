/**
 * Lightweight retrieval perf smoke (T075).
 * Uses in-memory/stub helpers — skips heavy DB when unavailable.
 */
import { describe, expect, it } from "vitest";
import { stubHashEmbedding } from "@/adapters/stub-ai";
import { formatKbGrounding, type KnowledgeHit } from "@/lib/ai/vector";
import {
  chartCategoriesForMode,
  resolveConsentMode,
} from "@/domain/ai/context-policy";

describe("ai retrieval perf smoke", () => {
  it("embeds + formats 50 synthetic KB hits under 500ms", () => {
    const start = performance.now();

    const query = stubHashEmbedding("mild fever self-care hydration");
    expect(query).toHaveLength(1536);

    const hits: KnowledgeHit[] = Array.from({ length: 50 }, (_, i) => ({
      chunkId: `c${i}`,
      docId: `d${i % 10}`,
      title: `Doc ${i}`,
      content: `Education snippet ${i} about wellness and self-care. `.repeat(8),
      locale: i % 2 === 0 ? ("EN" as const) : ("AR" as const),
      similarity: 0.9 - i * 0.01,
    }));

    const grounding = formatKbGrounding(hits.slice(0, 5));
    const mode = resolveConsentMode(true);
    const cats = chartCategoriesForMode(mode);

    const elapsed = performance.now() - start;
    expect(grounding).toContain("<<<KNOWLEDGE_BASE_DATA>>>");
    expect(cats.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  });
});
