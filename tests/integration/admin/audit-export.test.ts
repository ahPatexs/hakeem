import { describe, expect, it } from "vitest";
import { ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";

describe("audit export event type", () => {
  it("defines export audit type", () => {
    expect(ADMIN_AUDIT_TYPES.exportAudit).toBe("admin.export.audit");
  });
});
