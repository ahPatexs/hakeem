import { DomainRuleError } from "./errors";
import type { SafetyCheckResult } from "@/ports/safety-check";

export interface PrescriptionLineInput {
  medicationName: string;
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
}

export function assertHasLines(lines: PrescriptionLineInput[]): void {
  if (lines.length === 0 || lines.every((l) => !l.medicationName.trim())) {
    throw new DomainRuleError("VALIDATION_ERROR", "Prescription requires at least one medication line");
  }
}

/**
 * Safety gate before sign (FR-017):
 * - hard allergy match → block (no override in v1)
 * - high-severity interaction → explicit acknowledgement required
 * - allergy data unavailable → explicit acknowledgement required
 */
export function assertSafeToSign(
  check: SafetyCheckResult,
  acks: { interactionAck?: boolean; allergyDataUnavailableAck?: boolean },
): void {
  if (check.allergyMatches.length > 0) {
    throw new DomainRuleError(
      "ALLERGY_BLOCK",
      `Documented allergy match: ${check.allergyMatches.join(", ")}`,
    );
  }
  if (check.allergyDataUnavailable && !acks.allergyDataUnavailableAck) {
    throw new DomainRuleError("SAFETY_ACK_REQUIRED", "Allergy data unavailable — acknowledgement required");
  }
  if (check.highSeverityInteractions.length > 0 && !acks.interactionAck) {
    throw new DomainRuleError("SAFETY_ACK_REQUIRED", "High-severity interaction — acknowledgement required");
  }
}
