import { getAiAdapter } from "@/adapters";
import { assertAiAllowed as domainAssertAiAllowed } from "@/domain/platform/ai-governance";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import type { AiChatInput, AiChatResult } from "@/ports/ai-assistant";
import { isAiProviderAllowed, normalizeAiProviderName } from "@/lib/platform/ai-gate";

export type AiFeature = "patient" | "doctorDocumentation" | "doctorPrescription";

/**
 * Live-provider guard. Callers that can degrade to stub should catch this
 * and keep going — `getAiAdapter()` already returns stub when the gate fails.
 */
export function assertBaaGate(): void {
  const name = normalizeAiProviderName(process.env.AI_ASSISTANT_PROVIDER);
  if (!isAiProviderAllowed(name)) {
    throw new Error("PLATFORM_AI_BAA_REQUIRED");
  }
}

export async function assertAiAllowed(userId: string, feature: AiFeature): Promise<boolean> {
  assertBaaGate();
  return domainAssertAiAllowed(userId, feature);
}

export async function chat(
  input: AiChatInput & { userId: string; feature: AiFeature },
): Promise<PlatformResult<AiChatResult>> {
  if (!(await assertAiAllowed(input.userId, input.feature))) {
    return platformFail("FORBIDDEN", "AI assistance is disabled");
  }
  try {
    assertBaaGate();
    const result = await getAiAdapter().chat(input);
    return platformOk(result);
  } catch {
    return platformFail("DEPENDENCY_UNAVAILABLE", "AI provider unavailable");
  }
}
