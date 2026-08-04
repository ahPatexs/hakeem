import { localStorageAdapter } from "@/adapters/local-storage";
import { stubAiAssistantAdapter } from "@/adapters/stub-ai";
import { stubEmailAdapter } from "@/adapters/stub-email";
import { stubMalwareScanAdapter } from "@/adapters/stub-malware";
import { stubPaymentsAdapter } from "@/adapters/stub-payments";
import { stubPushAdapter } from "@/adapters/stub-push";
import { stubSafetyCheckAdapter } from "@/adapters/stub-safety-check";
import { stubSmsAdapter } from "@/adapters/stub-sms";
import { stubTelemedicineAdapter } from "@/adapters/stub-telemedicine";
import { liveKitTelemedicineAdapter } from "@/adapters/livekit-telemedicine";
import type { AiAssistantPort } from "@/ports/ai-assistant";
import type { EmailPort } from "@/ports/email";
import type { MalwareScanPort } from "@/ports/malware-scan";
import type { PaymentsPort } from "@/ports/payments";
import type { PushPort } from "@/ports/push";
import type { SafetyCheckPort } from "@/ports/safety-check";
import type { SmsPort } from "@/ports/sms";
import type { StoragePort } from "@/ports/storage";
import type { TelemedicinePort } from "@/ports/telemedicine";

function provider(name: string | undefined, fallback = "stub"): string {
  return (name ?? fallback).toLowerCase();
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
  switch (provider(process.env.AI_ASSISTANT_PROVIDER)) {
    case "stub":
    default:
      return stubAiAssistantAdapter;
  }
}

export function getStorageAdapter(): StoragePort {
  switch (provider(process.env.STORAGE_PROVIDER)) {
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
