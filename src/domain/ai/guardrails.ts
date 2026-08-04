export type InjectionCheckResult = {
  blocked: boolean;
  reason?: "injection";
};

export type OutputPolicyResult = {
  allowed: boolean;
  reason?: "diagnose" | "prescribe";
};

const INJECTION_PATTERNS: ReadonlyArray<RegExp> = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)/i,
  /ignore\s+your\s+(instructions?|rules?|safety|guidelines?)/i,
  /disregard\s+(your|all|previous)\s+(instructions?|rules?|safety)/i,
  /you\s+are\s+now\s+(a|an|in)\b/i,
  /\bjailbreak\b/i,
  /override\s+(your\s+)?(safety|guardrails?|restrictions?)/i,
  /pretend\s+(you\s+are|to\s+be)\b/i,
  /act\s+as\s+(if\s+you\s+(have\s+)?no\s+restrictions?|DAN)\b/i,
  /system\s+prompt\s*:/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  // Arabic injection heuristics
  new RegExp("تجاهل\\s*(كل\\s*)?(ال)?(تعليمات|قواعد|قيود)"),
  new RegExp("تجاوز\\s*(ال)?(سلامة|الحماية|القيود)"),
  new RegExp("أنت\\s*الآن\\s*(?:طبيب|بدون\\s*قيود)"),
];

const DIAGNOSE_OUTPUT: ReadonlyArray<RegExp> = [
  /\bi\s+diagnose\b/i,
  /\byou\s+(have|are\s+diagnosed\s+with)\b/i,
  /\byour\s+diagnosis\s+is\b/i,
  /this\s+is\s+(definitely|clearly)\s+\w+\s+(disease|syndrome|infection)/i,
  new RegExp("تشخيصك\\s*هو"),
  new RegExp("أنت\\s*مصاب\\s*ب"),
  new RegExp("لديك\\s*(مرض|التهاب|متلازمة)\\s+\\S+"),
];

const PRESCRIBE_OUTPUT: ReadonlyArray<RegExp> = [
  /\bi\s+(prescribe|am\s+prescribing)\b/i,
  /\btake\s+this\s+prescription\b/i,
  /\byou\s+should\s+take\s+\d+\s*(mg|mcg|ml)\b/i,
  /\bhere\s+is\s+your\s+(prescription|rx)\b/i,
  new RegExp("أصف\\s*لك"),
  new RegExp("خذ\\s*هذه\\s*الوصفة"),
  new RegExp("تناول\\s+\\d+\\s*(ملغ|مجم|مل)"),
];

/**
 * Pre-provider heuristic: detect prompt-injection / instruction-override attempts.
 */
export function detectInjection(text: string): InjectionCheckResult {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) return { blocked: false };

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { blocked: true, reason: "injection" };
    }
  }
  return { blocked: false };
}

/** Alias used by lib/ai facades. */
export const checkInjection = detectInjection;

/**
 * Post-generation policy for patient-facing replies: block definitive
 * diagnosis or prescription phrasing (FR-005).
 */
export function checkPatientOutputPolicy(text: string): OutputPolicyResult {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) return { allowed: true };

  for (const pattern of DIAGNOSE_OUTPUT) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: "diagnose" };
    }
  }
  for (const pattern of PRESCRIBE_OUTPUT) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: "prescribe" };
    }
  }
  return { allowed: true };
}
