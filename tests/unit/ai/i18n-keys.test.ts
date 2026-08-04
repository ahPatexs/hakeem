import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import ar from "@/i18n/messages/ar.json";

type Messages = typeof en;

function getAi(messages: Messages) {
  return (messages as unknown as { ai: Record<string, unknown> }).ai;
}

const REQUIRED_KEYS = [
  "disclaimer",
  "emergency",
  "unavailable",
  "consentRequired",
  "rateLimited",
  "loading",
  "error",
] as const;

describe("ai i18n keys (en/ar parity)", () => {
  it("defines the ai namespace in both locales", () => {
    expect(getAi(en)).toBeTruthy();
    expect(getAi(ar)).toBeTruthy();
  });

  it("defines scaffold common keys", () => {
    for (const messages of [en, ar]) {
      const ai = getAi(messages) as Record<string, string>;
      for (const key of REQUIRED_KEYS) {
        expect(ai[key], key).toBeTruthy();
      }
    }
  });

  it("keeps en and ar ai key sets in sync", () => {
    function keys(obj: unknown, prefix = ""): string[] {
      if (typeof obj !== "object" || obj === null) return [prefix];
      return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
        keys(value, prefix ? `${prefix}.${key}` : key),
      );
    }

    const enKeys = keys(getAi(en)).sort();
    const arKeys = keys(getAi(ar)).sort();
    expect(arKeys).toEqual(enKeys);
  });
});
