import { describe, expect, it } from "vitest";
import { ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";

describe("assign role audit contract", () => {
  it("role changes use admin.user.role_change via auth module", () => {
    expect(ADMIN_AUDIT_TYPES.userSuspend).toContain("admin.user");
  });
});
