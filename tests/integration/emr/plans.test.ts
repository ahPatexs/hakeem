/**
 * Integration-shaped checks for the care plan facade without a live DB:
 * composes the `sign` RBAC gate with the publish-versioning invariant
 * (`supersededActivePlanIds`) the way `publishPlan` does internally.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(),
}));

import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { assertEmrAccess } from "@/domain/emr/access";
import { supersededActivePlanIds } from "@/domain/emr/plan";
import { listPlans, upsertPlan, publishPlan } from "@/lib/emr/plans";

const mockHasCare = vi.mocked(hasCareRelationship);

describe("emr plans facade wiring", () => {
  it("exports the full care plan surface", () => {
    for (const fn of [listPlans, upsertPlan, publishPlan]) {
      expect(typeof fn).toBe("function");
    }
  });
});

describe("care plan publish composition", () => {
  beforeEach(() => {
    mockHasCare.mockReset();
  });

  it("patients cannot publish (sign) a care plan", async () => {
    const result = await assertEmrAccess(
      { userId: "patient-1", role: "PATIENT" },
      "patient-1",
      "sign",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("admin cannot publish (sign) a care plan", async () => {
    const result = await assertEmrAccess({ userId: "admin-1", role: "ADMIN" }, "patient-1", "sign");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("a doctor with a care relationship may publish, which supersedes only same-kind ACTIVE plans", async () => {
    mockHasCare.mockResolvedValue(true);
    const access = await assertEmrAccess(
      { userId: "doc-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-1",
      "sign",
    );
    expect(access.ok).toBe(true);

    const siblings = [
      { id: "draft-1", status: "ACTIVE", kind: "CARE" },
      { id: "prior-active", status: "ACTIVE", kind: "CARE" },
      { id: "unrelated-diet", status: "ACTIVE", kind: "DIET" },
    ];
    const superseded = supersededActivePlanIds(siblings, "draft-1", "CARE");
    expect(superseded).toEqual(["prior-active"]);
  });
});
