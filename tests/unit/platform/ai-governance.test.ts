import { describe, expect, it } from "vitest";
import { aiFailClosed } from "@/domain/platform/ai-governance";

/** Mirrors assertAiAllowed decision tree without DB. */
function evaluateAiAllowed(globalEnabled: boolean, userDisabled: boolean): boolean {
  if (!globalEnabled) return false;
  if (userDisabled) return false;
  return true;
}

describe("AI governance fail-closed", () => {
  it("aiFailClosed mirrors enabled flag", () => {
    expect(aiFailClosed(false)).toBe(false);
    expect(aiFailClosed(true)).toBe(true);
  });

  it("denies when global off or user disabled", () => {
    expect(evaluateAiAllowed(false, false)).toBe(false);
    expect(evaluateAiAllowed(true, true)).toBe(false);
    expect(evaluateAiAllowed(true, false)).toBe(true);
  });
});
