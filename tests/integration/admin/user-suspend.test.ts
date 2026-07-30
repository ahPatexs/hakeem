import { describe, expect, it } from "vitest";
import { assertNotSelf, validateReason } from "@/domain/admin/user-lifecycle";
import { AdminDomainError } from "@/domain/admin/errors";

describe("user suspend domain integration", () => {
  it("blocks self-suspend", () => {
    expect(() => assertNotSelf("admin-1", "admin-1")).toThrow(AdminDomainError);
    expect(() => assertNotSelf("admin-1", "user-2")).not.toThrow();
  });

  it("requires suspend reason length", () => {
    expect(() => validateReason("short")).toThrow(AdminDomainError);
    expect(validateReason("Suspended for policy violation")).toContain("Suspended");
  });
});
