import { describe, expect, it } from "vitest";
import { can } from "@/auth/rbac";

describe("admin rbac", () => {
  it("grants admin:portal:access only to ADMIN", () => {
    expect(can({ role: "ADMIN" }, "admin:portal:access")).toBe(true);
    expect(can({ role: "PATIENT" }, "admin:portal:access")).toBe(false);
    expect(can({ role: "DOCTOR" }, "admin:portal:access")).toBe(false);
  });

  it("includes expanded admin permissions for ADMIN", () => {
    expect(can({ role: "ADMIN" }, "admin:billing:refund")).toBe(true);
    expect(can({ role: "ADMIN" }, "admin:billing:read")).toBe(true);
    expect(can({ role: "DOCTOR" }, "admin:billing:refund")).toBe(false);
    expect(can({ role: "PATIENT" }, "admin:billing:read")).toBe(false);
    expect(can({ role: "ADMIN" }, "admin:ai:ops")).toBe(true);
    expect(can({ role: "ADMIN" }, "admin:settings:write")).toBe(true);
    expect(can({ role: "ADMIN" }, "admin:roles:write")).toBe(true);
  });
});
