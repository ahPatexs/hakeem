import type { AiAssistantPort, AiChatInput, AiChatResult } from "@/ports/ai-assistant";

const DISCLAIMER_EN =
  "This assistant provides general health information only and is not a substitute for professional medical advice, diagnosis, or treatment.";
const DISCLAIMER_AR =
  "يقدّم هذا المساعد معلومات صحية عامة فقط وليس بديلاً عن الاستشارة الطبية المهنية أو التشخيص أو العلاج.";

export class StubAiAssistantAdapter implements AiAssistantPort {
  async chat(input: AiChatInput): Promise<AiChatResult> {
    const lastUser = [...input.messages].reverse().find((m) => m.role === "user");
    const echoed = lastUser?.content?.trim() || "(empty message)";
    const disclaimer = input.locale === "ar" ? DISCLAIMER_AR : DISCLAIMER_EN;
    return {
      content: `${disclaimer}\n\n[Stub echo] You said: ${echoed}`,
      disclaimer,
    };
  }

  async *streamChat(input: AiChatInput): AsyncIterable<string> {
    const result = await this.chat(input);
    yield result.content;
  }
}

export const stubAiAssistantAdapter = new StubAiAssistantAdapter();
