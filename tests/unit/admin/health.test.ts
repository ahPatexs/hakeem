import { describe, expect, it } from "vitest";
import { deriveOverallStatus } from "@/domain/admin/health";

describe("health status derivation", () => {
  it("returns HEALTHY when all components ok", () => {
    expect(
      deriveOverallStatus([
        { key: "APP", ok: true, message: "ok" },
        { key: "DATABASE", ok: true, message: "ok" },
      ]),
    ).toBe("HEALTHY");
  });

  it("returns DOWN when critical component fails", () => {
    expect(
      deriveOverallStatus([
        { key: "DATABASE", ok: false, message: "fail" },
        { key: "APP", ok: true, message: "ok" },
      ]),
    ).toBe("DOWN");
  });

  it("returns DEGRADED when non-critical component fails", () => {
    expect(
      deriveOverallStatus([
        { key: "DATABASE", ok: true, message: "ok" },
        { key: "APP", ok: true, message: "ok" },
        { key: "AI", ok: false, message: "slow" },
      ]),
    ).toBe("DEGRADED");
  });
});
