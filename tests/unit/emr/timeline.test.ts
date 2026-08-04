import { describe, expect, it } from "vitest";
import { sortTimelineEvents, visibilityForRole } from "@/domain/emr/timeline";

describe("sortTimelineEvents", () => {
  it("orders newest first", () => {
    const sorted = sortTimelineEvents([
      { id: "a", effectiveAt: "2024-01-01T00:00:00.000Z" },
      { id: "b", effectiveAt: new Date("2025-06-01T12:00:00.000Z") },
      { id: "c", effectiveAt: "2024-12-15T08:00:00.000Z" },
    ]);
    expect(sorted.map((e) => e.id)).toEqual(["b", "c", "a"]);
  });
});

describe("visibilityForRole", () => {
  it("restricts ADMIN-only events", () => {
    expect(visibilityForRole("ADMIN", "ADMIN")).toBe(true);
    expect(visibilityForRole("DOCTOR", "ADMIN")).toBe(false);
    expect(visibilityForRole("PATIENT", "ADMIN")).toBe(false);
  });

  it("allows clinicians for CLINICIAN visibility", () => {
    expect(visibilityForRole("DOCTOR", "CLINICIAN")).toBe(true);
    expect(visibilityForRole("ADMIN", "CLINICIAN")).toBe(true);
    expect(visibilityForRole("PATIENT", "CLINICIAN")).toBe(false);
  });
});
