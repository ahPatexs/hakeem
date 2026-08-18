import { describe, expect, it } from "vitest";
import { can } from "@/auth/rbac";

describe("doctor earnings security", () => {
  it("does not grant doctor billing admin permissions", () => {
    expect(can({ role: "DOCTOR" }, "admin:billing:read")).toBe(false);
    expect(can({ role: "DOCTOR" }, "admin:billing:refund")).toBe(false);
    expect(can({ role: "PATIENT" }, "admin:billing:refund")).toBe(false);
    expect(can({ role: "ADMIN" }, "admin:billing:read")).toBe(true);
  });
});
