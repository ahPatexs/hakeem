import { GoogleGenAI } from "@google/genai";
import type {
  AiAssistantPort,
  AiChatInput,
  AiChatResult,
  AiMessage,
} from "@/ports/ai-assistant";

const MODEL_FALLBACKS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest"];
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 1024;

const DISCLAIMER_EN =
  "This assistant provides general health information only and is not a substitute for professional medical advice, diagnosis, or treatment.";
const DISCLAIMER_AR =
  "يقدّم هذا المساعد معلومات صحية عامة فقط وليس بديلاً عن الاستشارة الطبية المهنية أو التشخيص أو العلاج.";

type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

function splitMessages(messages: AiMessage[]): {
  systemInstruction?: string;
  contents: GeminiContent[];
} {
  const systemParts: string[] = [];
  const contents: GeminiContent[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
      continue;
    }
    const role = m.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0]!.text += "\n\n" + m.content;
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }

  if (contents[0]?.role === "model") {
    contents.unshift({ role: "user", parts: [{ text: "(context)" }] });
  }

  return {
    systemInstruction: systemParts.length ? systemParts.join("\n\n") : undefined,
    contents,
  };
}

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenAI({ apiKey });
}

function modelCandidates(input: AiChatInput): string[] {
  const requested = input.model?.model?.trim();
  const envModel = process.env.GEMINI_AI_MODEL?.trim();
  const names: string[] = [];
  if (requested && /^gemini/i.test(requested)) names.push(requested);
  if (envModel && /^gemini/i.test(envModel)) names.push(envModel);
  names.push(...MODEL_FALLBACKS);
  return [...new Set(names)];
}

function isRetryableModelError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number } | null)?.status;
  if (status === 404 || status === 429) return true;
  return /NOT_FOUND|not found|no longer available|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(message);
}

function generationConfig(input: AiChatInput) {
  // gemini-flash-latest uses internal reasoning tokens that count toward maxOutputTokens;
  // floor high enough so visible answers are not truncated to empty.
  const requested = input.model?.maxOutputTokens ?? DEFAULT_MAX_TOKENS;
  return {
    temperature: input.model?.temperature ?? DEFAULT_TEMPERATURE,
    maxOutputTokens: Math.max(requested, 2048),
  };
}

export class GeminiAssistantAdapter implements AiAssistantPort {
  async chat(input: AiChatInput): Promise<AiChatResult> {
    const { systemInstruction, contents } = splitMessages(input.messages);
    const disclaimer = input.locale === "ar" ? DISCLAIMER_AR : DISCLAIMER_EN;
    let lastError: unknown;

    for (const model of modelCandidates(input)) {
      try {
        const response = await client().models.generateContent({
          model,
          contents,
          config: {
            ...generationConfig(input),
            ...(systemInstruction ? { systemInstruction } : {}),
          },
        });

        const content = (response.text ?? "").trim();
        if (!content) {
          lastError = new Error(`Gemini ${model} returned empty content`);
          continue;
        }
        const usage = response.usageMetadata
          ? {
              promptTokens: response.usageMetadata.promptTokenCount ?? 0,
              completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
            }
          : undefined;

        return { content, disclaimer, usage };
      } catch (err) {
        lastError = err;
        if (!isRetryableModelError(err)) throw err;
        console.warn(`[ai.gemini] ${model} failed; trying next model`);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Gemini provider unavailable");
  }

  async *streamChat(input: AiChatInput): AsyncIterable<string> {
    const { systemInstruction, contents } = splitMessages(input.messages);
    let lastError: unknown;

    for (const model of modelCandidates(input)) {
      try {
        const stream = await client().models.generateContentStream({
          model,
          contents,
          config: {
            ...generationConfig(input),
            ...(systemInstruction ? { systemInstruction } : {}),
          },
        });

        let yielded = false;
        for await (const chunk of stream) {
          const delta = chunk.text;
          if (delta) {
            yielded = true;
            yield delta;
          }
        }
        if (yielded) return;
        lastError = new Error(`Gemini ${model} streamed empty content`);
      } catch (err) {
        lastError = err;
        if (!isRetryableModelError(err)) throw err;
        console.warn(`[ai.gemini] ${model} stream failed; trying next model`);
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Gemini provider unavailable");
  }
}

export const geminiAssistantAdapter = new GeminiAssistantAdapter();
