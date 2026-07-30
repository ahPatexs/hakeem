import { describe, expect, it } from "vitest";
import { ASIA_RIYADH, formatSar, resolveLocale } from "@/domain/platform/localization";

describe("locale resolution", () => {
  it("prefers explicit user preference over Accept-Language", () => {
    expect(resolveLocale("en-US", "ar")).toBe("ar");
    expect(resolveLocale("ar-SA", "en")).toBe("en");
  });

  it("falls back to Accept-Language Arabic preference", () => {
    expect(resolveLocale("ar-SA,ar;q=0.9")).toBe("ar");
    expect(resolveLocale("en-US,ar;q=0.8")).toBe("ar");
  });

  it("defaults to English when unknown", () => {
    expect(resolveLocale("fr-FR")).toBe("en");
    expect(resolveLocale(null)).toBe("en");
  });

  it("formats SAR with locale-aware output", () => {
    expect(formatSar(12_500, "en")).toContain("125");
    expect(formatSar(12_500, "ar")).toMatch(/[\d\u0660-\u0669]/);
  });

  it("uses Asia/Riyadh as shared timezone constant", () => {
    expect(ASIA_RIYADH).toBe("Asia/Riyadh");
  });
});
