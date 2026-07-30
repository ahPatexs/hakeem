import { describe, expect, it } from "vitest";
import { homePathForRole } from "@/auth/rbac";
import { SESSION_COOKIE, REFRESH_COOKIE } from "@/auth/cookies";

/**
 * Integration-style contract checks for auth flows (SC-003–SC-009 / SC-012–SC-015)
 * that do not require a live database.
 */
describe("auth flow contracts", () => {
  it("routes each role to its home after login (SC-003)", () => {
    expect(homePathForRole("PATIENT")).toBe("/patient");
    expect(homePathForRole("DOCTOR")).toBe("/doctor");
    expect(homePathForRole("ADMIN")).toBe("/admin");
  });

  it("documents session cookie names for middleware (SC-013)", () => {
    expect(SESSION_COOKIE).toMatch(/sid/);
    expect(REFRESH_COOKIE).toMatch(/refresh/);
  });
});
