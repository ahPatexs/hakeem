import { describe, expect, it } from "vitest";
import { assertNotSelf, validateReason } from "@/domain/admin/user-lifecycle";
import { AdminDomainError } from "@/domain/admin/errors";

describe("roles / lifecycle guards used by role revoke", () => {
  it("blocks self action", () => {
    expect(() => assertNotSelf("a1", "a1")).toThrow(AdminDomainError);
    expect(() => assertNotSelf("a1", "a2")).not.toThrow();
  });

  it("requires meaningful reason text", () => {
    expect(() => validateReason("short")).toThrow(AdminDomainError);
    expect(validateReason("This is a valid reason")).toBe("This is a valid reason");
  });
});
