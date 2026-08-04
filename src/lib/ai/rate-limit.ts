import type { AiFeatureKey } from "@prisma/client";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

type LimitSpec = { limit: number; windowMs: number; label: string };

const LIMITS: Partial<Record<AiFeatureKey, LimitSpec>> = {
  PATIENT_ASSISTANT: { limit: 30, windowMs: 60 * 60 * 1000, label: "30/hour" },
  SYMPTOM_CHECKER: { limit: 10, windowMs: 24 * 60 * 60 * 1000, label: "10/day" },
  DOCTOR_SOAP: { limit: 60, windowMs: 60 * 60 * 1000, label: "60/hour" },
  DOCTOR_SUMMARY: { limit: 60, windowMs: 60 * 60 * 1000, label: "60/hour" },
  RX_ASSIST: { limit: 60, windowMs: 60 * 60 * 1000, label: "60/hour" },
  CDS: { limit: 60, windowMs: 60 * 60 * 1000, label: "60/hour" },
  RECOMMENDATIONS: { limit: 30, windowMs: 60 * 60 * 1000, label: "30/hour" },
};

function take(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

/**
 * Per-user per-feature AI rate limit (in-memory Map, mirrors auth/rate-limit).
 * Returns RATE_LIMITED when exceeded.
 */
export function checkAiRateLimit(
  userId: string,
  feature: AiFeatureKey,
): PlatformResult<{ allowed: true }> {
  const spec = LIMITS[feature];
  if (!spec) return platformOk({ allowed: true });

  const ok = take(`ai:${feature}:${userId}`, spec.limit, spec.windowMs);
  if (!ok) {
    return platformFail(
      "RATE_LIMITED",
      `AI rate limit exceeded (${spec.label}). Please try again later.`,
    );
  }
  return platformOk({ allowed: true });
}

/** Test helper. */
export function __clearAiRateLimitBuckets() {
  buckets.clear();
}
