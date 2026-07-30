import { describe, expect, it } from "vitest";
import { buildAuditWhere } from "@/domain/admin/audit";

describe("audit query filters", () => {
  it("builds empty where when no filters", () => {
    expect(buildAuditWhere({})).toEqual({});
  });

  it("applies type and actor filters", () => {
    const where = buildAuditWhere({ type: "admin.user", actorUserId: "u1" });
    expect(where.type).toEqual({ contains: "admin.user" });
    expect(where.actorUserId).toBe("u1");
  });

  it("applies date range", () => {
    const from = new Date("2026-01-01");
    const to = new Date("2026-02-01");
    const where = buildAuditWhere({ from, to });
    expect(where.createdAt).toEqual({ gte: from, lte: to });
  });
});
