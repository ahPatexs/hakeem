/**
 * Security-focused re-run of key EMR RBAC cases (anti-enumeration + role matrix).
 * Mirrors `tests/unit/emr/access.test.ts` for the security suite path.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(),
}));

import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { assertEmrAccess } from "@/domain/emr/access";

const mockHasCare = vi.mocked(hasCareRelationship);

describe("EMR RBAC security", () => {
  beforeEach(() => {
    mockHasCare.mockReset();
  });

  it("patient self access succeeds", async () => {
    const result = await assertEmrAccess(
      { userId: "patient-1", role: "PATIENT" },
      "patient-1",
      "read",
    );
    expect(result.ok).toBe(true);
  });

  it("cross-patient chart access is forbidden", async () => {
    const result = await assertEmrAccess(
      { userId: "patient-1", role: "PATIENT" },
      "patient-2",
      "read",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("doctor without relationship gets NOT_FOUND (anti-enumeration)", async () => {
    mockHasCare.mockResolvedValue(false);
    const result = await assertEmrAccess(
      { userId: "doc-user", role: "DOCTOR", doctorId: "doctor-9" },
      "patient-1",
      "read",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("admin cannot sign clinical artifacts", async () => {
    const result = await assertEmrAccess(
      { userId: "admin-1", role: "ADMIN" },
      "patient-1",
      "sign",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});
