import { describe, expect, it } from "vitest";
import { ACTIVE_APPOINTMENT_STATUSES, periodStart } from "@/lib/admin/dashboard";

describe("dashboard helpers", () => {
  it("defines active appointment statuses", () => {
    expect(ACTIVE_APPOINTMENT_STATUSES).toContain("CONFIRMED");
    expect(ACTIVE_APPOINTMENT_STATUSES).toContain("IN_PROGRESS");
  });

  it("periodStart returns date in the past", () => {
    const start = periodStart(30);
    expect(start.getTime()).toBeLessThan(Date.now());
  });
});
