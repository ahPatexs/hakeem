import OpenAI from "openai";
import type {
  AiAssistantPort,
  AiChatInput,
  AiChatResult,
  AiMessage,
} from "@/ports/ai-assistant";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 1024;

const DISCLAIMER_EN =
  "This assistant provides general health information only and is not a substitute for professional medical advice, diagnosis, or treatment.";
const DISCLAIMER_AR =
  "يقدّم هذا المساعد معلومات صحية عامة فقط وليس بديلاً عن الاستشارة الطبية المهنية أو التشخيص أو العلاج.";

function toOpenAiMessages(messages: AiMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m) => ({
    role: m.role === "system" ? "system" : m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));
}

function client(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function modelParams(input: AiChatInput) {
  return {
    model: input.model?.model ?? DEFAULT_MODEL,
    temperature: input.model?.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: input.model?.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
  };
}

export class OpenAiAssistantAdapter implements AiAssistantPort {
  async chat(input: AiChatInput): Promise<AiChatResult> {
    const params = modelParams(input);
    const completion = await client().chat.completions.create({
      ...params,
      messages: toOpenAiMessages(input.messages),
    });

    const content = completion.choices[0]?.message?.content?.trim() ?? "";
    const disclaimer = input.locale === "ar" ? DISCLAIMER_AR : DISCLAIMER_EN;
    const usage = completion.usage
      ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
        }
      : undefined;

    return { content, disclaimer, usage };
  }

  async *streamChat(input: AiChatInput): AsyncIterable<string> {
    const params = modelParams(input);
    const stream = await client().chat.completions.create({
      ...params,
      messages: toOpenAiMessages(input.messages),
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}

export const openAiAssistantAdapter = new OpenAiAssistantAdapter();
