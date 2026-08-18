const SECRET_KEYS = /secret|signature|authorization|card|pan|cvv|cvc|clientSecret/i;

export function paymentLog(event: string, meta: Record<string, unknown>): void {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SECRET_KEYS.test(key)) continue;
    if (typeof value === "string" && value.startsWith("stub_secret_")) continue;
    safe[key] = value;
  }
  console.info(`[payments] ${event}`, safe);
}
