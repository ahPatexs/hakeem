export type AiMessageRole = "user" | "assistant" | "system";

export interface AiMessage {
  role: AiMessageRole;
  content: string;
}

export interface AiTokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface AiModelParams {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface AiChatInput {
  conversationId: string;
  messages: AiMessage[];
  locale: "en" | "ar";
  patientContext?: Record<string, unknown>;
  /** Active model config params (optional; adapters apply defaults). */
  model?: AiModelParams;
}

export interface AiChatResult {
  content: string;
  disclaimer: string;
  usage?: AiTokenUsage;
}

export interface AiAssistantPort {
  chat(input: AiChatInput): Promise<AiChatResult>;
  streamChat(input: AiChatInput): AsyncIterable<string>;
}
