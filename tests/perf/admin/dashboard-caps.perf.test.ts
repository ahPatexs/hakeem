import { describe, expect, it } from "vitest";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/admin/dashboard";

describe("admin dashboard perf caps", () => {
  it("limits active status set to non-terminal ops states", () => {
    expect(ACTIVE_APPOINTMENT_STATUSES.length).toBeLessThanOrEqual(5);
  });
});
