/** Initial delay ~1s, cap ~15 minutes; exponential backoff with full jitter. */
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 15 * 60 * 1_000;
export const DEFAULT_MAX_ATTEMPTS = 5;

/**
 * Returns delay before the next retry for a given attempt number (1-based).
 * Attempt 1 → ~1s, attempt 2 → ~2s, … capped at 15 minutes with jitter.
 */
export function nextDelayMs(attempt: number): number {
  if (attempt < 1) return BASE_DELAY_MS;
  const exp = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
  return Math.floor(Math.random() * exp);
}

export function canRetry(attempts: number, maxAttempts = DEFAULT_MAX_ATTEMPTS): boolean {
  return attempts < maxAttempts;
}
