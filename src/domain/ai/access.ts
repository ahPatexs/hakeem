export type AiFeatureKey =
  | "PATIENT_ASSISTANT"
  | "SYMPTOM_CHECKER"
  | "RECOMMENDATIONS"
  | "DOCTOR_SOAP"
  | "DOCTOR_SUMMARY"
  | "RX_ASSIST"
  | "CDS";

export type AiActorRole = "PATIENT" | "DOCTOR" | "ADMIN";

const PATIENT_FEATURES: ReadonlySet<AiFeatureKey> = new Set([
  "PATIENT_ASSISTANT",
  "SYMPTOM_CHECKER",
  "RECOMMENDATIONS",
]);

const DOCTOR_FEATURES: ReadonlySet<AiFeatureKey> = new Set([
  "DOCTOR_SOAP",
  "DOCTOR_SUMMARY",
  "RX_ASSIST",
  "CDS",
]);

/**
 * Feature × role access map.
 * Doctor clinical AI features require an established care relationship flag
 * (resolved by the facade via EMR care-relationship check — pure here).
 * Admin clinical features are denied; ops uses separate admin actions.
 */
export function canAccessAiFeature(
  role: AiActorRole,
  feature: AiFeatureKey,
  opts: { hasCareRelationship?: boolean } = {},
): boolean {
  switch (role) {
    case "PATIENT":
      return PATIENT_FEATURES.has(feature);
    case "DOCTOR":
      if (!DOCTOR_FEATURES.has(feature)) return false;
      return opts.hasCareRelationship === true;
    case "ADMIN":
      return false;
    default:
      return false;
  }
}

export function isDoctorFeature(feature: AiFeatureKey): boolean {
  return DOCTOR_FEATURES.has(feature);
}

export function isPatientFeature(feature: AiFeatureKey): boolean {
  return PATIENT_FEATURES.has(feature);
}

/** Alias used by lib/ai facades. */
export const isPatientFacingFeature = isPatientFeature;

/**
 * Async facade-friendly access check. When `hasCareRelationship` is omitted for
 * doctor features, returns false (fail-closed); callers should resolve care
 * relationship via EMR before invoking.
 */
export function assertAiFeatureAccess(
  role: AiActorRole,
  feature: AiFeatureKey,
  opts: { hasCareRelationship?: boolean } = {},
): { allowed: boolean } {
  return { allowed: canAccessAiFeature(role, feature, opts) };
}
