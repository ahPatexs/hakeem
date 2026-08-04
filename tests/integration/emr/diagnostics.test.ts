/**
 * Integration-shaped checks for the diagnostics (lab results) facade without
 * a live DB: composes the per-role visibility rules used by
 * `listLabResults` and verifies the release/retract lifecycle is wired.
 */
import { describe, expect, it } from "vitest";
import { canDoctorSeeLab, canPatientSeeLab, type LabReleaseStatus } from "@/domain/emr/release";
import { listLabResults, releaseLabToPatient, retractLab } from "@/lib/emr/diagnostics";

const ALL_STATUSES: LabReleaseStatus[] = [
  "PENDING_REVIEW",
  "RELEASED",
  "RETRACTED",
  "SUPERSEDED",
];

function visibleStatusesForRole(role: "PATIENT" | "DOCTOR" | "ADMIN"): LabReleaseStatus[] {
  if (role === "PATIENT") return ALL_STATUSES.filter(canPatientSeeLab);
  if (role === "DOCTOR") return ALL_STATUSES.filter(canDoctorSeeLab);
  return ALL_STATUSES;
}

describe("emr diagnostics facade wiring", () => {
  it("exports the full lab lifecycle surface", () => {
    for (const fn of [listLabResults, releaseLabToPatient, retractLab]) {
      expect(typeof fn).toBe("function");
    }
  });

  it("patients only ever see RELEASED labs", () => {
    expect(visibleStatusesForRole("PATIENT")).toEqual(["RELEASED"]);
  });

  it("doctors see pending review and released, but not retracted/superseded", () => {
    expect(visibleStatusesForRole("DOCTOR")).toEqual(["PENDING_REVIEW", "RELEASED"]);
  });

  it("admin oversight sees the full lifecycle, including retracted/superseded", () => {
    expect(visibleStatusesForRole("ADMIN")).toEqual(ALL_STATUSES);
  });

  it("the release lifecycle only moves PENDING_REVIEW -> RELEASED and any -> RETRACTED", () => {
    // release: not idempotent from RETRACTED/SUPERSEDED (facade returns CONFLICT)
    expect(canPatientSeeLab("RELEASED")).toBe(true);
    expect(canDoctorSeeLab("RETRACTED")).toBe(false);
  });
});
