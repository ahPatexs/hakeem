/**
 * Integration-shaped checks for the prescriptions facade without a live DB:
 * composes the patient-mutation guard used at the facade boundary with the
 * `renewPrescription` short-circuit and the RBAC gate it relies on.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(),
}));

import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { assertEmrAccess } from "@/domain/emr/access";
import {
  listPrescriptions,
  renewPrescription,
  denyPatientPrescriptionMutation,
} from "@/lib/emr/prescriptions";

const mockHasCare = vi.mocked(hasCareRelationship);

describe("emr prescriptions facade wiring", () => {
  it("exports the full prescription surface", () => {
    for (const fn of [listPrescriptions, renewPrescription, denyPatientPrescriptionMutation]) {
      expect(typeof fn).toBe("function");
    }
  });
});

describe("prescription renewal composition", () => {
  beforeEach(() => {
    mockHasCare.mockReset();
  });

  it("denyPatientPrescriptionMutation is the same guard renewPrescription short-circuits on", async () => {
    const patient = { userId: "patient-1", role: "PATIENT" as const };

    const guardResult = denyPatientPrescriptionMutation(patient);
    expect(guardResult?.ok).toBe(false);

    const renewResult = await renewPrescription(patient, { fromPrescriptionId: "rx-1" });
    expect(renewResult.ok).toBe(false);
    if (!renewResult.ok && guardResult && !guardResult.ok) {
      expect(renewResult.code).toBe(guardResult.code);
    }
    expect(mockHasCare).not.toHaveBeenCalled();
  });

  it("a doctor renewing still needs write_clinical access to the target chart", async () => {
    mockHasCare.mockResolvedValue(false);
    const result = await assertEmrAccess(
      { userId: "doc-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-2",
      "write_clinical",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});
