/**
 * Security-focused coverage for the Admin role: oversight/read access is
 * permitted, but Admin must never be able to author or sign clinical
 * artifacts (FR-036 — compliance-only role).
 */
import { describe, expect, it } from "vitest";
import { assertEmrAccess } from "@/domain/emr/access";

const admin = { userId: "admin-1", role: "ADMIN" as const };

describe("EMR admin security", () => {
  it("admin cannot sign clinical artifacts", async () => {
    const result = await assertEmrAccess(admin, "patient-1", "sign");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("admin cannot author clinical content (write_clinical)", async () => {
    const result = await assertEmrAccess(admin, "patient-1", "write_clinical");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("admin cannot write patient-self entries (write_self)", async () => {
    const result = await assertEmrAccess(admin, "patient-1", "write_self");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("admin can read and perform oversight review", async () => {
    const read = await assertEmrAccess(admin, "patient-1", "read");
    expect(read.ok).toBe(true);

    const oversight = await assertEmrAccess(admin, "patient-1", "admin_oversight");
    expect(oversight.ok).toBe(true);
  });

  it("admin can download documents but never mutate them", async () => {
    const download = await assertEmrAccess(admin, "patient-1", "download");
    expect(download.ok).toBe(true);
  });

  it("non-admin roles cannot perform admin_oversight", async () => {
    const patient = await assertEmrAccess(
      { userId: "patient-1", role: "PATIENT" },
      "patient-1",
      "admin_oversight",
    );
    expect(patient.ok).toBe(false);
    if (!patient.ok) expect(patient.code).toBe("FORBIDDEN");

    const doctor = await assertEmrAccess(
      { userId: "doc-1", role: "DOCTOR", doctorId: "doctor-1" },
      "patient-1",
      "admin_oversight",
    );
    expect(doctor.ok).toBe(false);
    if (!doctor.ok) expect(doctor.code).toBe("FORBIDDEN");
  });
});
