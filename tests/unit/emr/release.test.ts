import { describe, expect, it } from "vitest";
import { canDoctorSeeLab, canPatientSeeLab } from "@/domain/emr/release";

describe("lab release visibility", () => {
  it("allows patient to see RELEASED only", () => {
    expect(canPatientSeeLab("RELEASED")).toBe(true);
    expect(canPatientSeeLab("PENDING_REVIEW")).toBe(false);
    expect(canPatientSeeLab("RETRACTED")).toBe(false);
    expect(canPatientSeeLab("SUPERSEDED")).toBe(false);
  });

  it("allows doctor to see PENDING_REVIEW and RELEASED", () => {
    expect(canDoctorSeeLab("PENDING_REVIEW")).toBe(true);
    expect(canDoctorSeeLab("RELEASED")).toBe(true);
    expect(canDoctorSeeLab("RETRACTED")).toBe(false);
    expect(canDoctorSeeLab("SUPERSEDED")).toBe(false);
  });
});
