import { describe, expect, it } from "vitest";
import {
  canAccessDocument,
  isDocumentAvailable,
  isSignedClinicalImmutable,
} from "@/domain/platform/documents";

describe("medical document ACL", () => {
  it("fail-closed when scan is not CLEAN", () => {
    expect(isDocumentAvailable("PENDING")).toBe(false);
    expect(isDocumentAvailable("REJECTED")).toBe(false);
    expect(canAccessDocument("patient-1", "patient-1", "PATIENT", { scanStatus: "PENDING" })).toBe(
      false,
    );
  });

  it("allows patient owner when CLEAN", () => {
    expect(canAccessDocument("patient-1", "patient-1", "PATIENT", { scanStatus: "CLEAN" })).toBe(
      true,
    );
  });

  it("allows doctor with care relationship and denies strangers", () => {
    expect(
      canAccessDocument("doctor-1", "patient-1", "DOCTOR", {
        scanStatus: "CLEAN",
        hasCareRelationship: true,
      }),
    ).toBe(true);
    expect(
      canAccessDocument("doctor-2", "patient-1", "DOCTOR", {
        scanStatus: "CLEAN",
        hasCareRelationship: false,
      }),
    ).toBe(false);
    expect(canAccessDocument("patient-2", "patient-1", "PATIENT", { scanStatus: "CLEAN" })).toBe(
      false,
    );
  });

  it("treats signed clinical artifacts as immutable", () => {
    expect(isSignedClinicalImmutable(new Date())).toBe(true);
    expect(isSignedClinicalImmutable(null)).toBe(false);
  });
});
