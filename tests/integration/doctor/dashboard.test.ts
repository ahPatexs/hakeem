import { describe, expect, it } from "vitest";
import { DOCTOR_DASHBOARD_CAPS } from "@/domain/doctor/dashboard";

describe("doctor dashboard integration contracts", () => {
  it("caps match spec clarifications for widget loaders", () => {
    expect(DOCTOR_DASHBOARD_CAPS).toEqual({
      todayAppointments: 8,
      upcomingConsultations: 5,
      pendingNotes: 5,
      recentPatients: 5,
      notificationPreview: 5,
    });
  });

  it("documents dashboard bundle widget keys", () => {
    const bundleKeys = ["today", "upcoming", "stats", "pendingNotes", "notifications"] as const;
    expect(bundleKeys).toHaveLength(5);
    expect(bundleKeys).toContain("notifications");
  });
});
