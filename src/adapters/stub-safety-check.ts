import type { SafetyCheckInput, SafetyCheckPort, SafetyCheckResult } from "@/ports/safety-check";

/**
 * v1 safety adapter: naive case-insensitive substring match between
 * documented allergies and ordered medication names. A formulary vendor
 * adapter can replace this behind the same port. Checks are flagged
 * `partial` because free-text coding cannot guarantee completeness.
 */
export class StubSafetyCheckAdapter implements SafetyCheckPort {
  async check(input: SafetyCheckInput): Promise<SafetyCheckResult> {
    const allergies = input.allergies.map((a) => a.trim().toLowerCase()).filter(Boolean);
    const matches = new Set<string>();

    for (const med of input.medications) {
      const m = med.trim().toLowerCase();
      if (!m) continue;
      for (const allergy of allergies) {
        if (m.includes(allergy) || allergy.includes(m)) {
          matches.add(med);
        }
      }
    }

    return {
      allergyMatches: [...matches],
      highSeverityInteractions: [],
      allergyDataUnavailable: false,
      partial: true,
    };
  }
}

export const stubSafetyCheckAdapter = new StubSafetyCheckAdapter();
