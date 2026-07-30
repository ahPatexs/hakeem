import { describe, expect, it } from "vitest";
import { ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";

describe("appointment cancel audit contract", () => {
  it("defines appointment cancel audit type", () => {
    expect(ADMIN_AUDIT_TYPES.appointmentCancel).toBe("admin.appointment.cancel");
  });
});
