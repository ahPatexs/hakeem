import { GoogleGenAI } from "@google/genai";
import type {
  AiAssistantPort,
  AiChatInput,
  AiChatResult,
  AiMessage,
} from "@/ports/ai-assistant";

const DEFAULT_MODEL = "gemini-flash-latest";
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

function modelName(input: AiChatInput): string {
  const fallback = process.env.GEMINI_AI_MODEL || DEFAULT_MODEL;
  const requested = input.model?.model?.trim();
  // Active DB configs may still list OpenAI ids (gpt-*); ignore those for Gemini.
  if (requested && /^gemini/i.test(requested)) return requested;
  return fallback;
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
    const response = await client().models.generateContent({
      model: modelName(input),
      contents,
      config: {
        ...generationConfig(input),
        ...(systemInstruction ? { systemInstruction } : {}),
      },
    });

    const content = (response.text ?? "").trim();
    const disclaimer = input.locale === "ar" ? DISCLAIMER_AR : DISCLAIMER_EN;
    const usage = response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
        }
      : undefined;

    return { content, disclaimer, usage };
  }

  async *streamChat(input: AiChatInput): AsyncIterable<string> {
    const { systemInstruction, contents } = splitMessages(input.messages);
    const stream = await client().models.generateContentStream({
      model: modelName(input),
      contents,
      config: {
        ...generationConfig(input),
        ...(systemInstruction ? { systemInstruction } : {}),
      },
    });

    for await (const chunk of stream) {
      const delta = chunk.text;
      if (delta) yield delta;
    }
  }
}

export const geminiAssistantAdapter = new GeminiAssistantAdapter();
