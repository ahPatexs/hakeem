export interface SafetyCheckInput {
  /** Patient-reported / structured allergy strings. */
  allergies: string[];
  /** Medication names on the draft prescription. */
  medications: string[];
}

export interface SafetyCheckResult {
  /** Medication names that match a documented allergy (hard block). */
  allergyMatches: string[];
  /** High-severity interaction descriptions requiring acknowledgement. */
  highSeverityInteractions: string[];
  /** True when the allergy list could not be loaded/evaluated. */
  allergyDataUnavailable: boolean;
  /** True when checks are partial (incomplete coding) — show soft warning. */
  partial: boolean;
}

export interface SafetyCheckPort {
  check(input: SafetyCheckInput): Promise<SafetyCheckResult>;
}
