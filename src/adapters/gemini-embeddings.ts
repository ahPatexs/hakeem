import { GoogleGenAI } from "@google/genai";
import type { AiEmbeddingsPort } from "@/ports/ai-embeddings";

const MODEL = "text-embedding-004";

export class GeminiEmbeddingsAdapter implements AiEmbeddingsPort {
  readonly model = MODEL;

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const client = new GoogleGenAI({ apiKey });
    const vectors: number[][] = [];

    for (const text of texts) {
      const response = await client.models.embedContent({
        model: MODEL,
        contents: text,
      });
      const values = response.embeddings?.[0]?.values ?? [];
      vectors.push(values);
    }

    return vectors;
  }
}

export const geminiEmbeddingsAdapter = new GeminiEmbeddingsAdapter();