export function isPricingEnabled(): boolean {
  return process.env.PRICING_ENABLED === "true";
}
