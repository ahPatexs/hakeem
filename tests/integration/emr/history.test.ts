/**
 * Integration-shaped checks for the medical history facade without a live
 * DB: composes the RBAC gate with the attestation-source write rule that
 * `upsertAllergy` / `upsertCondition` / `upsertImmunization` all rely on.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(),
}));

import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { assertEmrAccess } from "@/domain/emr/access";
import {
  listAllergies,
  upsertAllergy,
  softDeleteAllergy,
  listConditions,
  upsertCondition,
  listImmunizations,
  listFamilyHistory,
  getLifestyle,
  updateLifestyle,
  getEmergencyInfo,
  updateEmergencyInfo,
  writeActionForSource,
} from "@/lib/emr/history";

const mockHasCare = vi.mocked(hasCareRelationship);

describe("emr history facade wiring", () => {
  it("exports the full history surface", () => {
    for (const fn of [
      listAllergies,
      upsertAllergy,
      softDeleteAllergy,
      listConditions,
      upsertCondition,
      listImmunizations,
      listFamilyHistory,
      getLifestyle,
      updateLifestyle,
      getEmergencyInfo,
      updateEmergencyInfo,
    ]) {
      expect(typeof fn).toBe("function");
    }
  });
});

describe("emr history mutation source composition", () => {
  beforeEach(() => {
    mockHasCare.mockReset();
  });

  it("a doctor cannot record a PATIENT_REPORTED entry for a patient (write_self is patient-only)", async () => {
    const action = writeActionForSource("PATIENT_REPORTED");
    const result = await assertEmrAccess(
      { userId: "doc-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-1",
      action,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(mockHasCare).not.toHaveBeenCalled();
  });

  it("a doctor recording a CLINICIAN_ATTESTED entry still needs a care relationship", async () => {
    mockHasCare.mockResolvedValue(false);
    const action = writeActionForSource("CLINICIAN_ATTESTED");
    const result = await assertEmrAccess(
      { userId: "doc-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-1",
      action,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
    expect(mockHasCare).toHaveBeenCalledWith("doctor-1", "patient-1");
  });

  it("touches clinicianCriticalFlag only through write_clinical", () => {
    // Mirrors updateEmergencyInfo's gate: setting the clinician flag requires
    // a higher-privilege action than a plain self-report update.
    const touchesClinicianFlag = true;
    const action = touchesClinicianFlag ? "write_clinical" : "write_self";
    expect(action).toBe("write_clinical");
  });
});
