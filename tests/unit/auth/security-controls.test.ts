import { describe, expect, it } from "vitest";
import { sessionCookieOptions, refreshCookieOptions, SESSION_COOKIE, REFRESH_COOKIE } from "@/auth/cookies";
import { isCsrfError } from "@/auth/csrf";
import { AUDIT_RETENTION_DAYS, auditRetentionCutoff } from "@/auth/audit-retention";
import { can, assertRole } from "@/auth/rbac";
import { AuthDomainError } from "@/auth/errors";

describe("cookie security flags (FR-046)", () => {
  it("sets HttpOnly, SameSite=Lax on session and refresh cookies", () => {
    const session = sessionCookieOptions(3600);
    const refresh = refreshCookieOptions();
    expect(SESSION_COOKIE).toBe("hakeem.sid");
    expect(REFRESH_COOKIE).toBe("hakeem.refresh");
    expect(session.httpOnly).toBe(true);
    expect(session.sameSite).toBe("lax");
    expect(refresh.httpOnly).toBe(true);
    expect(refresh.sameSite).toBe("lax");
    expect(refresh.maxAge).toBe(30 * 24 * 60 * 60);
  });
});

describe("csrf helper", () => {
  it("detects CSRF errors", () => {
    expect(isCsrfError(new Error("CSRF"))).toBe(true);
    expect(isCsrfError(new Error("other"))).toBe(false);
  });
});

describe("audit retention (FR-048)", () => {
  it("uses >= 365 day cutoff", () => {
    expect(AUDIT_RETENTION_DAYS).toBeGreaterThanOrEqual(365);
    const now = new Date("2026-07-29T00:00:00.000Z");
    const cutoff = auditRetentionCutoff(now);
    expect(cutoff.toISOString()).toBe("2025-07-29T00:00:00.000Z");
  });
});

describe("rbac denial", () => {
  it("blocks patient from admin permission", () => {
    expect(can({ role: "PATIENT" }, "admin:users:write")).toBe(false);
    expect(() =>
      assertRole({ id: "1", email: "p@x.com", role: "PATIENT", name: null }, ["ADMIN"]),
    ).toThrow(AuthDomainError);
  });
});
