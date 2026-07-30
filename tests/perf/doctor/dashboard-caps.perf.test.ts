import { describe, expect, it } from "vitest";
import { DOCTOR_DASHBOARD_CAPS, AI_RATE_LIMIT_PER_HOUR } from "@/domain/doctor/dashboard";

describe("doctor dashboard performance caps", () => {
  it("keeps widget take limits bounded for fast dashboard loads", () => {
    const caps = Object.values(DOCTOR_DASHBOARD_CAPS);
    expect(Math.max(...caps)).toBeLessThanOrEqual(8);
    expect(caps.reduce((sum, n) => sum + n, 0)).toBeLessThanOrEqual(28);
  });

  it("aligns AI rate limit with streaming route quota", () => {
    expect(AI_RATE_LIMIT_PER_HOUR).toBe(30);
  });
});
