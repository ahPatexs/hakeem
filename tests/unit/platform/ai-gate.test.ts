import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isAiBaaSatisfied,
  isAiProviderAllowed,
  isPhiProductionEnvironment,
} from "@/lib/platform/ai-gate";

describe("AI provider gate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("treats Vercel preview as non-production even when NODE_ENV is production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PLATFORM_AI_BAA_SATISFIED", "false");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    expect(isPhiProductionEnvironment()).toBe(false);
    expect(isAiProviderAllowed("gemini")).toBe(true);
  });

  it("blocks live providers in Vercel production without BAA", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PLATFORM_AI_BAA_SATISFIED", "false");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    expect(isPhiProductionEnvironment()).toBe(true);
    expect(isAiBaaSatisfied()).toBe(false);
    expect(isAiProviderAllowed("gemini")).toBe(false);
    expect(isAiProviderAllowed("stub")).toBe(true);
  });

  it("allows live providers in production when BAA is satisfied", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("PLATFORM_AI_BAA_SATISFIED", "true");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    expect(isAiProviderAllowed("gemini")).toBe(true);
  });

  it("rejects gemini without an API key", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("PLATFORM_AI_BAA_SATISFIED", "true");
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(isAiProviderAllowed("gemini")).toBe(false);
  });
});
