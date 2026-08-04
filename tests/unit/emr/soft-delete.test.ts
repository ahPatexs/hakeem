import { describe, expect, it, vi } from "vitest";
import { softDeleteWhere, isSoftDeleted } from "@/domain/emr/soft-delete";
import { canPatientSeeLab, canDoctorSeeLab } from "@/domain/emr/release";
import { latestConsentState } from "@/domain/emr/consent";
import { canAmendSigned, requireAmendmentReason } from "@/domain/emr/versioning";
import { assertEmrAccess } from "@/domain/emr/access";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(async () => false),
}));

describe("soft-delete helpers", () => {
  it("softDeleteWhere excludes deleted rows", () => {
    expect(softDeleteWhere()).toEqual({ deletedAt: null });
  });

  it("isSoftDeleted detects tombstones", () => {
    expect(isSoftDeleted({ deletedAt: new Date() })).toBe(true);
    expect(isSoftDeleted({ deletedAt: null })).toBe(false);
  });
});

describe("consent append-only state", () => {
  it("withdraw after ack yields WITHDRAWN", () => {
    const state = latestConsentState(
      [
        { typeCode: "TELEHEALTH", kind: "ACKNOWLEDGE", at: new Date("2024-01-01") },
        { typeCode: "TELEHEALTH", kind: "WITHDRAW", at: new Date("2024-02-01") },
      ],
      "TELEHEALTH",
    );
    expect(state).toBe("WITHDRAWN");
  });
});

describe("version helpers", () => {
  it("signed artifacts require amendment reason", () => {
    expect(requireAmendmentReason("clinician correction").ok).toBe(true);
    expect(requireAmendmentReason("  ").ok).toBe(false);
  });

  it("canAmendSigned only when signedAt present", () => {
    expect(canAmendSigned(new Date())).toBe(true);
    expect(canAmendSigned(null)).toBe(false);
  });
});

describe("lab release visibility", () => {
  it("patient cannot see unreleased", () => {
    expect(canPatientSeeLab("PENDING_REVIEW")).toBe(false);
    expect(canPatientSeeLab("RELEASED")).toBe(true);
  });

  it("doctor can see preliminary", () => {
    expect(canDoctorSeeLab("PENDING_REVIEW")).toBe(true);
  });
});

describe("i18n emr keys", () => {
  it("en and ar share primary emr keys", () => {
    const en = JSON.parse(
      readFileSync(resolve("src/i18n/messages/en.json"), "utf8"),
    ) as { emr: Record<string, unknown> };
    const ar = JSON.parse(
      readFileSync(resolve("src/i18n/messages/ar.json"), "utf8"),
    ) as { emr: Record<string, unknown> };
    for (const key of ["summary", "timeline", "criticalAlerts", "consent", "history"]) {
      expect(en.emr[key]).toBeTruthy();
      expect(ar.emr[key]).toBeTruthy();
    }
  });
});

describe("admin deny-sign", () => {
  it("admin cannot sign", async () => {
    const result = await assertEmrAccess({ userId: "a1", role: "ADMIN" }, "p1", "sign");
    expect(result.ok).toBe(false);
  });
});
