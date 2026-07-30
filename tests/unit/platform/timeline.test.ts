import { describe, expect, it } from "vitest";
import { canViewTimelineEvent } from "@/domain/platform/timeline";

const event = {
  patientUserId: "patient-1",
  assignedDoctorUserId: "doctor-1",
  visibility: "BOTH" as const,
};

describe("activity timeline visibility", () => {
  it("allows patient owner for BOTH visibility", () => {
    expect(canViewTimelineEvent("patient-1", "PATIENT", event)).toBe(true);
  });

  it("allows assigned doctor for BOTH visibility", () => {
    expect(canViewTimelineEvent("doctor-1", "DOCTOR", event)).toBe(true);
  });

  it("denies unrelated viewers", () => {
    expect(canViewTimelineEvent("patient-2", "PATIENT", event)).toBe(false);
    expect(canViewTimelineEvent("doctor-2", "DOCTOR", event)).toBe(false);
  });

  it("respects PATIENT-only visibility", () => {
    const patientOnly = { ...event, visibility: "PATIENT" as const };
    expect(canViewTimelineEvent("patient-1", "PATIENT", patientOnly)).toBe(true);
    expect(canViewTimelineEvent("doctor-1", "DOCTOR", patientOnly)).toBe(false);
  });
});
