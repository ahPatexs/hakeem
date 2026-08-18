export const DEFAULT_CONSULTATION_FEE_CENTS = 15_000;
export const CONSULT_FEE_SETTING_KEY = "billing.consultationFeeCents";
export const BILLING_CURRENCY = "SAR" as const;
export const STUCK_PROCESSING_MS = 15 * 60 * 1000;
export const RECONCILE_NO_CAPTURE_MS = 30 * 60 * 1000;
export const FAILED_RETRY_MAX = 5;
export const FAILED_RETRY_WINDOW_MS = 60 * 60 * 1000;
export const INVOICE_PREFIX = "HK-INV";
export const CREDIT_NOTE_PREFIX = "HK-CN";
export const BILLING_TIME_ZONE = "Asia/Riyadh";
export const BILLING_AUDIT_RETENTION_DAYS = 6 * 365;

export function paymentReconcileIdempotencyKey(obligationId: string, now = new Date()): string {
  return `payment-reconcile:${obligationId}:${now.toISOString().slice(0, 10)}`;
}

export function formatBillingDateTime(at: Date, locale = "en-GB"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: BILLING_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(at);
}

export function formatBillingDate(at: Date, locale = "en-GB"): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: BILLING_TIME_ZONE,
    dateStyle: "medium",
  }).format(at);
}

export function parseConsultFeeCents(
  raw: string | null | undefined,
  fallback = DEFAULT_CONSULTATION_FEE_CENTS,
): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 10_000_000) return fallback;
  return n;
}
