import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(),
}));

import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { assertEmrAccess } from "@/domain/emr/access";

const mockHasCare = vi.mocked(hasCareRelationship);

describe("assertEmrAccess", () => {
  beforeEach(() => {
    mockHasCare.mockReset();
  });

  it("allows patient self read", async () => {
    const result = await assertEmrAccess(
      { userId: "patient-1", role: "PATIENT" },
      "patient-1",
      "read",
    );
    expect(result.ok).toBe(true);
  });

  it("denies cross-patient access", async () => {
    const result = await assertEmrAccess(
      { userId: "patient-1", role: "PATIENT" },
      "patient-2",
      "read",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns NOT_FOUND when doctor has no care relationship", async () => {
    mockHasCare.mockResolvedValue(false);
    const result = await assertEmrAccess(
      { userId: "doc-user-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-1",
      "read",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
    expect(mockHasCare).toHaveBeenCalledWith("doctor-1", "patient-1");
  });

  it("allows doctor with care relationship to read", async () => {
    mockHasCare.mockResolvedValue(true);
    const result = await assertEmrAccess(
      { userId: "doc-user-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-1",
      "read",
    );
    expect(result.ok).toBe(true);
  });

  it("forbids admin from signing", async () => {
    const result = await assertEmrAccess(
      { userId: "admin-1", role: "ADMIN" },
      "patient-1",
      "sign",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});
