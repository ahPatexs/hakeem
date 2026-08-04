import { describe, expect, it } from "vitest";
import { canPatientSeeLab, canDoctorSeeLab } from "@/domain/emr/release";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { latestConsentState } from "@/domain/emr/consent";
import { supersededActivePlanIds } from "@/domain/emr/plan";
import { denyPatientPrescriptionMutation } from "@/lib/emr/prescriptions";
import { assertEmrAccess } from "@/domain/emr/access";
import { vi } from "vitest";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(async () => true),
}));

describe("integration emr domain compositions", () => {
  it("history soft-delete filter is always deletedAt null", () => {
    expect(softDeleteWhere()).toEqual({ deletedAt: null });
  });

  it("diagnostics release/retract visibility compensation", () => {
    expect(canDoctorSeeLab("PENDING_REVIEW")).toBe(true);
    expect(canPatientSeeLab("PENDING_REVIEW")).toBe(false);
    expect(canPatientSeeLab("RETRACTED")).toBe(false);
    expect(canDoctorSeeLab("RETRACTED")).toBe(false);
  });

  it("consent ack then withdraw retains append-only semantics", () => {
    expect(
      latestConsentState(
        [
          { typeCode: "DATA", kind: "ACKNOWLEDGE", at: new Date(1) },
          { typeCode: "DATA", kind: "WITHDRAW", at: new Date(2) },
        ],
        "DATA",
      ),
    ).toBe("WITHDRAWN");
  });

  it("plan publish supersession composition", () => {
    expect(
      supersededActivePlanIds(
        [
          { id: "a", status: "ACTIVE", kind: "CARE" },
          { id: "b", status: "ACTIVE", kind: "CARE" },
        ],
        "b",
        "CARE",
      ),
    ).toEqual(["a"]);
  });

  it("prescription sign path denies patients", () => {
    expect(denyPatientPrescriptionMutation({ userId: "p", role: "PATIENT" })?.ok).toBe(false);
  });

  it("timeline RBAC: doctor with care can read; patient cross-chart denied", async () => {
    const doctor = await assertEmrAccess(
      { userId: "d", role: "DOCTOR", doctorId: "doc" },
      "p1",
      "read",
    );
    expect(doctor.ok).toBe(true);
    const patient = await assertEmrAccess(
      { userId: "p1", role: "PATIENT" },
      "p2",
      "read",
    );
    expect(patient.ok).toBe(false);
  });

  it("admin oversight read allowed; sign denied", async () => {
    expect(
      (await assertEmrAccess({ userId: "a", role: "ADMIN" }, "p1", "admin_oversight")).ok,
    ).toBe(true);
    expect((await assertEmrAccess({ userId: "a", role: "ADMIN" }, "p1", "sign")).ok).toBe(false);
  });
});
