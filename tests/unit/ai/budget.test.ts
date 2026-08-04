import { describe, expect, it } from "vitest";
import { checkSpend } from "@/domain/ai/budget";

describe("checkSpend", () => {
  it("returns ok under threshold", () => {
    expect(checkSpend(50, 100, 80, false)).toBe("ok");
    expect(checkSpend(79, 100, 80, true)).toBe("ok");
  });

  it("returns ALERT at or above threshold without hard block", () => {
    expect(checkSpend(80, 100, 80, false)).toBe("ALERT");
    expect(checkSpend(95, 100, 80, false)).toBe("ALERT");
    expect(checkSpend(100, 100, 80, false)).toBe("ALERT");
  });

  it("returns BLOCKED when hardCap and spend reaches budget", () => {
    expect(checkSpend(100, 100, 80, true)).toBe("BLOCKED");
    expect(checkSpend(120, 100, 80, true)).toBe("BLOCKED");
  });

  it("alerts (not blocks) when over threshold but under hard-cap budget", () => {
    expect(checkSpend(85, 100, 80, true)).toBe("ALERT");
  });

  it("treats zero budget with hardCap as BLOCKED", () => {
    expect(checkSpend(0, 0, 80, true)).toBe("BLOCKED");
  });
});
