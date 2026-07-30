import { describe, expect, it } from "vitest";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/admin/dashboard";

describe("dashboard snapshot isolation contract", () => {
  it("defines active appointment statuses for widget", () => {
    expect(ACTIVE_APPOINTMENT_STATUSES).toContain("CONFIRMED");
    expect(ACTIVE_APPOINTMENT_STATUSES).toContain("IN_PROGRESS");
    expect(ACTIVE_APPOINTMENT_STATUSES).not.toContain("COMPLETED");
  });
});
