import type { SafetyCheckInput, SafetyCheckResult } from "@/ports/safety-check";
import { getSafetyCheckAdapter } from "@/adapters";

/** Platform facade for prescription / medication safety checks (FR-025). */
export async function runSafetyCheck(input: SafetyCheckInput): Promise<SafetyCheckResult> {
  return getSafetyCheckAdapter().check(input);
}

export { getSafetyCheckAdapter };
