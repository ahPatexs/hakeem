import { describe, expect, it } from "vitest";

const ADMIN_NOTIFICATION_CATEGORIES = [
  "ADMIN_OPS",
  "SECURITY",
  "HEALTH",
  "AI_GOVERNANCE",
  "PAYMENT",
  "SYSTEM",
] as const;

describe("admin notification categories", () => {
  it("includes governance and health categories", () => {
    expect(ADMIN_NOTIFICATION_CATEGORIES).toContain("HEALTH");
    expect(ADMIN_NOTIFICATION_CATEGORIES).toContain("AI_GOVERNANCE");
    expect(ADMIN_NOTIFICATION_CATEGORIES).toContain("ADMIN_OPS");
  });
});
