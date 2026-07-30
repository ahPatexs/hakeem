import { describe, expect, it } from "vitest";
import { assertNotSelf } from "@/domain/admin/user-lifecycle";
import { AdminDomainError } from "@/domain/admin/errors";
import { validateReason } from "@/domain/admin/user-lifecycle";

describe("user lifecycle guards", () => {
  it("blocks self suspend/deactivate", () => {
    expect(() => assertNotSelf("u1", "u1")).toThrow(AdminDomainError);
    expect(() => assertNotSelf("u1", "u2")).not.toThrow();
  });

  it("requires reason length >= 10", () => {
    expect(() => validateReason("short")).toThrow(AdminDomainError);
    expect(validateReason("Valid admin reason text")).toBe("Valid admin reason text");
  });
});
