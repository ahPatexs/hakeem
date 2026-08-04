import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(),
}));

import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { assertEmrAccess } from "@/domain/emr/access";
import { writeActionForSource } from "@/lib/emr/history";

const mockHasCare = vi.mocked(hasCareRelationship);

describe("writeActionForSource", () => {
  it("requires write_clinical for clinician-attested entries", () => {
    expect(writeActionForSource("CLINICIAN_ATTESTED")).toBe("write_clinical");
  });

  it("requires write_self for patient-reported entries", () => {
    expect(writeActionForSource("PATIENT_REPORTED")).toBe("write_self");
  });
});

describe("history mutation RBAC by attestation source", () => {
  beforeEach(() => {
    mockHasCare.mockReset();
  });

  it("allows a patient to record their own patient-reported entry", async () => {
    const action = writeActionForSource("PATIENT_REPORTED");
    const result = await assertEmrAccess(
      { userId: "patient-1", role: "PATIENT" },
      "patient-1",
      action,
    );
    expect(result.ok).toBe(true);
  });

  it("forbids a patient from writing a clinician-attested entry", async () => {
    const action = writeActionForSource("CLINICIAN_ATTESTED");
    const result = await assertEmrAccess(
      { userId: "patient-1", role: "PATIENT" },
      "patient-1",
      action,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("allows a doctor with a care relationship to record a clinician-attested entry", async () => {
    mockHasCare.mockResolvedValue(true);
    const action = writeActionForSource("CLINICIAN_ATTESTED");
    const result = await assertEmrAccess(
      { userId: "doc-user-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-1",
      action,
    );
    expect(result.ok).toBe(true);
  });

  it("forbids a doctor from writing a patient-reported (write_self) entry", async () => {
    const action = writeActionForSource("PATIENT_REPORTED");
    const result = await assertEmrAccess(
      { userId: "doc-user-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-1",
      action,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});
