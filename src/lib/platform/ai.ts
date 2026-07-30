import { getAiAdapter } from "@/adapters";
import { assertAiAllowed as domainAssertAiAllowed } from "@/domain/platform/ai-governance";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import type { AiChatInput, AiChatResult } from "@/ports/ai-assistant";

export type AiFeature = "patient" | "doctorDocumentation" | "doctorPrescription";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function isStubProvider(): boolean {
  return (process.env.AI_ASSISTANT_PROVIDER ?? "stub") === "stub";
}

/** Block non-stub AI providers in production without BAA gate. */
export function assertBaaGate(): void {
  if (isProduction() && !isStubProvider() && process.env.PLATFORM_AI_BAA_SATISFIED !== "true") {
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
