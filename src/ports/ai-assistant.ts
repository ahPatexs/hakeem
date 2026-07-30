export type AiMessageRole = "user" | "assistant" | "system";

export interface AiMessage {
  role: AiMessageRole;
  content: string;
}

export interface AiChatInput {
  conversationId: string;
  messages: AiMessage[];
  locale: "en" | "ar";
  patientContext?: Record<string, unknown>;
}

export interface AiChatResult {
  content: string;
  disclaimer: string;
}

export interface AiAssistantPort {
  chat(input: AiChatInput): Promise<AiChatResult>;
  streamChat?(input: AiChatInput): AsyncIterable<string>;
}
