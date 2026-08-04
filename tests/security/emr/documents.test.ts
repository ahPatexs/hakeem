/**
 * Security-focused coverage for document access: a patient must never be able
 * to read/download another patient's clinical documents, and a doctor without
 * a care relationship must get an anti-enumeration NOT_FOUND (never FORBIDDEN).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(),
}));

import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { assertEmrAccess } from "@/domain/emr/access";
import { canAccessDocument } from "@/domain/platform/documents";

const mockHasCare = vi.mocked(hasCareRelationship);

describe("EMR documents security", () => {
  beforeEach(() => {
    mockHasCare.mockReset();
  });

  it("denies a patient from reading or downloading another patient's chart", async () => {
    const read = await assertEmrAccess(
      { userId: "patient-1", role: "PATIENT" },
      "patient-2",
      "read",
    );
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.code).toBe("FORBIDDEN");

    const download = await assertEmrAccess(
      { userId: "patient-1", role: "PATIENT" },
      "patient-2",
      "download",
    );
    expect(download.ok).toBe(false);
    if (!download.ok) expect(download.code).toBe("FORBIDDEN");
  });

  it("allows a patient to download their own documents", async () => {
    const result = await assertEmrAccess(
      { userId: "patient-1", role: "PATIENT" },
      "patient-1",
      "download",
    );
    expect(result.ok).toBe(true);
  });

  it("hides existence of a chart from a doctor without a care relationship (anti-enumeration)", async () => {
    mockHasCare.mockResolvedValue(false);
    const result = await assertEmrAccess(
      { userId: "doc-user-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-2",
      "download",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("allows a doctor with a care relationship to download", async () => {
    mockHasCare.mockResolvedValue(true);
    const result = await assertEmrAccess(
      { userId: "doc-user-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-1",
      "download",
    );
    expect(result.ok).toBe(true);
  });

  it("file-level ACL denies a doctor without a care relationship even given a valid document", () => {
    const allowed = canAccessDocument("doc-user-1", "patient-1", "DOCTOR", {
      scanStatus: "CLEAN",
      hasCareRelationship: false,
    });
    expect(allowed).toBe(false);
  });

  it("file-level ACL fails closed while malware scan is pending/rejected", () => {
    expect(
      canAccessDocument("patient-1", "patient-1", "PATIENT", { scanStatus: "PENDING" }),
    ).toBe(false);
    expect(
      canAccessDocument("patient-1", "patient-1", "PATIENT", { scanStatus: "REJECTED" }),
    ).toBe(false);
    expect(
      canAccessDocument("patient-1", "patient-1", "PATIENT", { scanStatus: "CLEAN" }),
    ).toBe(true);
  });
});
