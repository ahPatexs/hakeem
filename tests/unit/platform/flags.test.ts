import { describe, expect, it } from "vitest";
import { isFeatureEnabled, isPushEnabled } from "@/domain/platform/flags";

describe("platform feature flags", () => {
  it("evaluates boolean and string settings", () => {
    expect(isFeatureEnabled(true)).toBe(true);
    expect(isFeatureEnabled("true")).toBe(true);
    expect(isFeatureEnabled("1")).toBe(true);
    expect(isFeatureEnabled("false")).toBe(false);
    expect(isFeatureEnabled(undefined)).toBe(false);
  });

  it("maps push env flag", () => {
    const prev = process.env.PUSH_ENABLED;
    process.env.PUSH_ENABLED = "true";
    expect(isPushEnabled()).toBe(true);
    process.env.PUSH_ENABLED = "false";
    expect(isPushEnabled()).toBe(false);
    process.env.PUSH_ENABLED = prev;
  });
});
