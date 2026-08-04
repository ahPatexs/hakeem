import { describe, expect, it } from "vitest";
import {
  chartCategoriesForMode,
  mayIncludeChartGrounding,
  resolveConsentMode,
} from "@/domain/ai/context-policy";

describe("context-policy", () => {
  it("resolves PERSONALIZED when data-sharing consent is present", () => {
    expect(resolveConsentMode(true)).toBe("PERSONALIZED");
  });

  it("resolves GENERAL without consent", () => {
    expect(resolveConsentMode(false)).toBe("GENERAL");
  });

  it("minimizes chart categories in GENERAL mode", () => {
    expect(chartCategoriesForMode("GENERAL")).toEqual([]);
    expect(mayIncludeChartGrounding("GENERAL")).toBe(false);
  });

  it("allows patient-visible categories in PERSONALIZED mode", () => {
    const cats = chartCategoriesForMode("PERSONALIZED");
    expect(cats).toContain("allergies");
    expect(cats).toContain("conditions");
    expect(mayIncludeChartGrounding("PERSONALIZED")).toBe(true);
  });
});
