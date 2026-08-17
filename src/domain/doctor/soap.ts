import { createHash } from "crypto";
import { DomainRuleError } from "./errors";

/** Amendments after this window are flagged as late in audit. */
export const LATE_AMENDMENT_MS = 72 * 60 * 60 * 1000;

export interface SoapContent {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

/** SOAP finalize requires non-empty Assessment and Plan (S/O warn only). */
export function assertSoapFinalizable(content: SoapContent): void {
  if (!content.assessment.trim() || !content.plan.trim()) {
    throw new DomainRuleError("SIGN_REQUIREMENTS", "Assessment and Plan are required to finalize");
  }
}

export function soapFinalizeWarnings(content: SoapContent): string[] {
  const warnings: string[] = [];
  if (!content.subjective.trim()) warnings.push("subjective");
  if (!content.objective.trim()) warnings.push("objective");
  return warnings;
}

/** Clinical summary finalize requires a non-empty body. */
export function assertSummaryFinalizable(body: string): void {
  if (!body.trim()) {
    throw new DomainRuleError("SIGN_REQUIREMENTS", "Summary body is required to finalize");
  }
}

export function isLateAmendment(originalSignedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - originalSignedAt.getTime() > LATE_AMENDMENT_MS;
}

export function hashSoapContent(content: SoapContent): string {
  return createHash("sha256")
    .update(JSON.stringify([content.subjective, content.objective, content.assessment, content.plan]))
    .digest("hex");
}

export function hashSummaryContent(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

/** Patient-facing visit note from signed SOAP (Assessment + Plan only). */
export function formatPatientFacingVisitNotes(
  locale: "en" | "ar",
  content: Pick<SoapContent, "assessment" | "plan">,
): string {
  const assessment = content.assessment.trim();
  const plan = content.plan.trim();
  if (locale === "ar") {
    return `التقييم\n${assessment}\n\nالخطة\n${plan}`;
  }
  return `Assessment\n${assessment}\n\nPlan\n${plan}`;
}
