import { describe, expect, it, vi } from "vitest";
import { assertEmrAccess } from "@/domain/emr/access";
import { canPatientSeeLab } from "@/domain/emr/release";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(async () => true),
}));

describe("emr labs security", () => {
  it("patient visibility matrix blocks pending review", () => {
    expect(canPatientSeeLab("PENDING_REVIEW")).toBe(false);
    expect(canPatientSeeLab("RETRACTED")).toBe(false);
    expect(canPatientSeeLab("RELEASED")).toBe(true);
  });
});

describe("emr documents security", () => {
  it("cross-patient download denied", async () => {
    const result = await assertEmrAccess(
      { userId: "p1", role: "PATIENT" },
      "other-patient",
      "download",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});

describe("emr admin security", () => {
  it("admin cannot sign clinical artifacts", async () => {
    const result = await assertEmrAccess({ userId: "a1", role: "ADMIN" }, "p1", "sign");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("admin can perform oversight", async () => {
    const result = await assertEmrAccess(
      { userId: "a1", role: "ADMIN" },
      "p1",
      "admin_oversight",
    );
    expect(result.ok).toBe(true);
  });
});
