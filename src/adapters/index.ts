import { localStorageAdapter } from "@/adapters/local-storage";
import { dbStorageAdapter } from "@/adapters/db-storage";
import { geminiAssistantAdapter } from "@/adapters/gemini-ai";
import { geminiEmbeddingsAdapter } from "@/adapters/gemini-embeddings";
import { openAiAssistantAdapter } from "@/adapters/openai-ai";
import { openAiEmbeddingsAdapter } from "@/adapters/openai-embeddings";
import { stubAiAssistantAdapter, stubEmbeddingsAdapter } from "@/adapters/stub-ai";
import { stubEmailAdapter } from "@/adapters/stub-email";
import { stubMalwareScanAdapter } from "@/adapters/stub-malware";
import { stubPaymentsAdapter } from "@/adapters/stub-payments";
import { stubPushAdapter } from "@/adapters/stub-push";
import { stubSafetyCheckAdapter } from "@/adapters/stub-safety-check";
import { stubSmsAdapter } from "@/adapters/stub-sms";
import { stubTelemedicineAdapter } from "@/adapters/stub-telemedicine";
import { liveKitTelemedicineAdapter } from "@/adapters/livekit-telemedicine";
import type { AiAssistantPort } from "@/ports/ai-assistant";
import type { AiEmbeddingsPort } from "@/ports/ai-embeddings";
import type { EmailPort } from "@/ports/email";
import type { MalwareScanPort } from "@/ports/malware-scan";
import type { PaymentsPort } from "@/ports/payments";
import type { PushPort } from "@/ports/push";
import type { SafetyCheckPort } from "@/ports/safety-check";
import type { SmsPort } from "@/ports/sms";
import type { StoragePort } from "@/ports/storage";
import type { TelemedicinePort } from "@/ports/telemedicine";
import type { AiProviderKind } from "@prisma/client";
import { isAiProviderAllowed } from "@/lib/platform/ai-gate";

function provider(name: string | undefined, fallback = "stub"): string {
  return (name ?? fallback).toLowerCase();
}

function liveOrStub<T>(providerName: string, live: T, stub: T, label: string): T {
  if (isAiProviderAllowed(providerName)) return live;
  if (providerName !== "stub") {
    console.warn(`[ai] ${label} provider "${providerName}" is not eligible; using stub`);
  }
  return stub;
}

export function getPaymentsAdapter(): PaymentsPort {
  switch (provider(process.env.PAYMENT_PROVIDER)) {
    case "stub":
    default:
      return stubPaymentsAdapter;
  }
}

export function getEmailAdapter(): EmailPort {
  switch (provider(process.env.EMAIL_PROVIDER)) {
    case "stub":
    default:
      return stubEmailAdapter;
  }
}

export function getSmsAdapter(): SmsPort {
  switch (provider(process.env.SMS_PROVIDER)) {
    case "stub":
    default:
      return stubSmsAdapter;
  }
}

export function getPushAdapter(): PushPort {
  switch (provider(process.env.PUSH_PROVIDER)) {
    case "stub":
    default:
      return stubPushAdapter;
  }
}

export function getAiAdapter(): AiAssistantPort {
  const name = provider(process.env.AI_ASSISTANT_PROVIDER);
  switch (name) {
    case "gemini":
    case "google":
      return liveOrStub<AiAssistantPort>(name, geminiAssistantAdapter, stubAiAssistantAdapter, "assistant");
    case "openai":
      return liveOrStub<AiAssistantPort>(name, openAiAssistantAdapter, stubAiAssistantAdapter, "assistant");
    case "stub":
    default:
      return stubAiAssistantAdapter;
  }
}

/** Honor per-feature admin model config. STUB is explicit; OPENAI means the live env adapter. */
export function getAiAdapterForKind(kind: AiProviderKind): AiAssistantPort {
  if (kind === "STUB") return stubAiAssistantAdapter;
  return getAiAdapter();
}

export function getEmbeddingsAdapter(): AiEmbeddingsPort {
  const name = provider(process.env.AI_EMBEDDINGS_PROVIDER ?? process.env.AI_ASSISTANT_PROVIDER);
  switch (name) {
    case "gemini":
    case "google":
      return liveOrStub<AiEmbeddingsPort>(name, geminiEmbeddingsAdapter, stubEmbeddingsAdapter, "embeddings");
    case "openai":
      return liveOrStub<AiEmbeddingsPort>(name, openAiEmbeddingsAdapter, stubEmbeddingsAdapter, "embeddings");
    case "stub":
    default:
      return stubEmbeddingsAdapter;
  }
}

export function getStorageAdapter(): StoragePort {
  const name = provider(process.env.STORAGE_PROVIDER, process.env.VERCEL ? "db" : "local");
  switch (name) {
    case "db":
    case "postgres":
    case "neon":
      return dbStorageAdapter;
    case "local":
    case "stub":
    default:
      return localStorageAdapter;
  }
}

export function getTelemedicineAdapter(): TelemedicinePort {
  switch (provider(process.env.TELEMEDICINE_ADAPTER ?? process.env.TELEMEDICINE_PROVIDER)) {
    case "livekit":
      return liveKitTelemedicineAdapter;
    case "stub":
    default:
      return stubTelemedicineAdapter;
  }
}

export function getMalwareAdapter(): MalwareScanPort {
  switch (provider(process.env.MALWARE_PROVIDER)) {
    case "stub":
    default:
      return stubMalwareScanAdapter;
  }
}

export function getSafetyCheckAdapter(): SafetyCheckPort {
  switch (provider(process.env.SAFETY_CHECK_PROVIDER)) {
    case "stub":
    default:
      return stubSafetyCheckAdapter;
  }
}
