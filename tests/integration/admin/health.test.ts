import { describe, expect, it } from "vitest";
import { deriveOverallStatus } from "@/domain/admin/health";

describe("health snapshot persistence contract", () => {
  it("derives DOWN when database fails", () => {
    expect(
      deriveOverallStatus([
        { key: "DATABASE", ok: false, message: "fail" },
        { key: "APP", ok: true, message: "ok" },
      ]),
    ).toBe("DOWN");
  });
});
