export type AiConsentMode = "PERSONALIZED" | "GENERAL";

/**
 * Consent for DATA_SHARING unlocks personalized chart grounding;
 * otherwise AI runs in general-wellness mode (FR-030).
 */
export function resolveConsentMode(hasDataSharingConsent: boolean): AiConsentMode {
  return hasDataSharingConsent ? "PERSONALIZED" : "GENERAL";
}

/** Chart categories allowed in personalized grounding (patient-visible set). */
export const PERSONALIZED_CHART_CATEGORIES = [
  "conditions",
  "allergies",
  "medications",
  "vitals",
  "labs",
] as const;

export type ChartCategory = (typeof PERSONALIZED_CHART_CATEGORIES)[number];

/**
 * Minimization: GENERAL mode gets no chart categories; PERSONALIZED gets
 * the patient-visible category allow-list only.
 */
export function chartCategoriesForMode(mode: AiConsentMode): readonly ChartCategory[] {
  return mode === "PERSONALIZED" ? PERSONALIZED_CHART_CATEGORIES : [];
}

export function mayIncludeChartGrounding(mode: AiConsentMode): boolean {
  return mode === "PERSONALIZED";
}
