export function isFeatureEnabled(value: string | boolean | undefined | null): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  return false;
}

/** Sync env check — accepts PLATFORM_PUSH_ENABLED (canonical) or legacy PUSH_ENABLED. */
export function isPushEnabled(): boolean {
  return (
    process.env.PLATFORM_PUSH_ENABLED === "true" || process.env.PUSH_ENABLED === "true"
  );
}
