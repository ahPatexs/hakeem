import { describe, expect, it } from "vitest";
import {
  validatePasswordPolicy,
  hashPassword,
  verifyPassword,
  assertNotInPasswordHistory,
} from "@/auth/passwords";
import { can, hasRole, homePathForRole } from "@/auth/rbac";
import { AuthDomainError } from "@/auth/errors";
import { hashToken } from "@/auth/tokens";

describe("password policy", () => {
  it("accepts a strong password", () => {
    expect(() => validatePasswordPolicy("Str0ng!Pass#99", "user@example.com")).not.toThrow();
  });

  it("rejects short or email-matching passwords", () => {
    expect(() => validatePasswordPolicy("Short1!", "a@b.com")).toThrow(AuthDomainError);
    expect(() => validatePasswordPolicy("user@example.com", "user@example.com")).toThrow(
      AuthDomainError,
    );
  });

  it("hashes and verifies", async () => {
    const hashed = await hashPassword("Str0ng!Pass#99");
    expect(hashed).not.toContain("Str0ng");
    expect(await verifyPassword("Str0ng!Pass#99", hashed)).toBe(true);
    expect(await verifyPassword("wrong", hashed)).toBe(false);
  });

  it("blocks password history reuse", async () => {
    const hashed = await hashPassword("Str0ng!Pass#99");
    await expect(assertNotInPasswordHistory("Str0ng!Pass#99", [hashed])).rejects.toBeInstanceOf(
      AuthDomainError,
    );
  });
});

describe("rbac", () => {
  it("uses flat role permissions", () => {
    expect(can({ role: "PATIENT" }, "patient:portal")).toBe(true);
    expect(can({ role: "PATIENT" }, "admin:users:write")).toBe(false);
    expect(can({ role: "ADMIN" }, "doctor:portal")).toBe(false);
    expect(hasRole({ role: "DOCTOR" }, ["DOCTOR", "ADMIN"])).toBe(true);
    expect(homePathForRole("ADMIN")).toBe("/admin");
  });
});

describe("tokens", () => {
  it("hashes tokens stably", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toBe(hashToken("abcd"));
  });
});
