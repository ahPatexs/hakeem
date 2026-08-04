import OpenAI from "openai";
import type { AiEmbeddingsPort } from "@/ports/ai-embeddings";

const MODEL = "text-embedding-3-small";

export class OpenAiEmbeddingsAdapter implements AiEmbeddingsPort {
  readonly model = MODEL;

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.embeddings.create({
      model: MODEL,
      input: texts,
    });

    const byIndex = new Map(response.data.map((row) => [row.index, row.embedding]));
    return texts.map((_, i) => byIndex.get(i) ?? []);
  }
}

export const openAiEmbeddingsAdapter = new OpenAiEmbeddingsAdapter();
