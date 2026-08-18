/**
 * BAA / provider eligibility for AI adapters.
 * Kept free of adapter imports to avoid cycles with `src/adapters/index.ts`.
 */

export function isPhiProductionEnvironment(): boolean {
  const vercelEnv = process.env.VERCEL_ENV;
  // Vercel sets NODE_ENV=production for preview too; only the production
  // target is the PHI go-live gate.
  if (vercelEnv) return vercelEnv === "production";
  return process.env.NODE_ENV === "production";
}

export function isAiBaaSatisfied(): boolean {
  return process.env.PLATFORM_AI_BAA_SATISFIED === "true";
}

export function normalizeAiProviderName(name: string | undefined): string {
  return (name ?? "stub").trim().toLowerCase();
}

/**
 * Whether the selected provider may be called (vs serving the local stub).
 * Stub is always allowed. Live providers need a key, and production PHI
 * also needs the BAA env gate.
 */
export function isAiProviderAllowed(providerName: string): boolean {
  const name = normalizeAiProviderName(providerName);
  if (name === "stub") return true;
  if (isPhiProductionEnvironment() && !isAiBaaSatisfied()) return false;
  if ((name === "gemini" || name === "google") && !process.env.GEMINI_API_KEY?.trim()) {
    return false;
  }
  if (name === "openai" && !process.env.OPENAI_API_KEY?.trim()) return false;
  return true;
}
