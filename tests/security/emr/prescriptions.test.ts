/**
 * Security-focused RBAC coverage for prescription mutations: patients must
 * never be able to draft, sign, or renew prescriptions. Mirrors the matrix
 * style of `tests/security/emr/rbac.test.ts`.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(),
}));

import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { assertEmrAccess } from "@/domain/emr/access";
import { denyPatientPrescriptionMutation, renewPrescription } from "@/lib/emr/prescriptions";

const mockHasCare = vi.mocked(hasCareRelationship);

describe("EMR prescriptions security", () => {
  beforeEach(() => {
    mockHasCare.mockReset();
  });

  it("denyPatientPrescriptionMutation blocks patient-authored draft/sign at the facade boundary", () => {
    const denied = denyPatientPrescriptionMutation({ userId: "patient-1", role: "PATIENT" });
    expect(denied).not.toBeNull();
    if (denied) {
      expect(denied.ok).toBe(false);
      if (!denied.ok) expect(denied.code).toBe("FORBIDDEN");
    }
  });

  it("denyPatientPrescriptionMutation does not block doctors or admins", () => {
    expect(
      denyPatientPrescriptionMutation({ userId: "doc-1", role: "DOCTOR", doctorId: "doctor-1" }),
    ).toBeNull();
    expect(denyPatientPrescriptionMutation({ userId: "admin-1", role: "ADMIN" })).toBeNull();
  });

  it("patients cannot renew prescriptions (rejected before any DB access)", async () => {
    const result = await renewPrescription(
      { userId: "patient-1", role: "PATIENT" },
      { fromPrescriptionId: "rx-1" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(mockHasCare).not.toHaveBeenCalled();
  });

  it("assertEmrAccess forbids patients from write_clinical and sign (draft/sign gate)", async () => {
    const draft = await assertEmrAccess(
      { userId: "patient-1", role: "PATIENT" },
      "patient-1",
      "write_clinical",
    );
    expect(draft.ok).toBe(false);
    if (!draft.ok) expect(draft.code).toBe("FORBIDDEN");

    const sign = await assertEmrAccess({ userId: "patient-1", role: "PATIENT" }, "patient-1", "sign");
    expect(sign.ok).toBe(false);
    if (!sign.ok) expect(sign.code).toBe("FORBIDDEN");
  });

  it("doctor without a care relationship cannot sign (anti-enumeration NOT_FOUND)", async () => {
    mockHasCare.mockResolvedValue(false);
    const result = await assertEmrAccess(
      { userId: "doc-user-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-2",
      "sign",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("doctor with a care relationship may write_clinical and sign", async () => {
    mockHasCare.mockResolvedValue(true);
    const draft = await assertEmrAccess(
      { userId: "doc-user-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-1",
      "write_clinical",
    );
    expect(draft.ok).toBe(true);

    const sign = await assertEmrAccess(
      { userId: "doc-user-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-1",
      "sign",
    );
    expect(sign.ok).toBe(true);
  });

  it("admin cannot draft or sign prescriptions (read/oversight only)", async () => {
    const draft = await assertEmrAccess({ userId: "admin-1", role: "ADMIN" }, "patient-1", "write_clinical");
    expect(draft.ok).toBe(false);
    if (!draft.ok) expect(draft.code).toBe("FORBIDDEN");

    const sign = await assertEmrAccess({ userId: "admin-1", role: "ADMIN" }, "patient-1", "sign");
    expect(sign.ok).toBe(false);
    if (!sign.ok) expect(sign.code).toBe("FORBIDDEN");
  });
});
