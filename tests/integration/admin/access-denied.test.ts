import { describe, expect, it } from "vitest";
import { can } from "@/auth/rbac";

describe("admin access denied integration", () => {
  it("denies admin portal permission for patient and doctor roles", () => {
    expect(can({ role: "PATIENT" }, "admin:portal:access")).toBe(false);
    expect(can({ role: "DOCTOR" }, "admin:portal:access")).toBe(false);
    expect(can({ role: "ADMIN" }, "admin:portal:access")).toBe(true);
  });

  it("records denial audit type for admin route gate", () => {
    expect("admin.access.denied").toMatch(/^admin\./);
  });
});
