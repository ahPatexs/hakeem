import { describe, expect, it } from "vitest";
import { buildCriticalFlags } from "@/lib/emr/summary";

describe("buildCriticalFlags", () => {
  it("includes only allergies flagged critical", () => {
    const flags = buildCriticalFlags({
      patientUserId: "patient-1",
      role: "DOCTOR",
      allergies: [
        { id: "a1", substance: "Penicillin", criticalFlag: true },
        { id: "a2", substance: "Pollen", criticalFlag: false },
      ],
      emergency: null,
      criticalLabs: [],
    });
    expect(flags).toEqual([{ id: "allergy:a1", kind: "allergy", label: "Penicillin" }]);
  });

  it("adds an emergency flag when clinicianCriticalFlag is set", () => {
    const flags = buildCriticalFlags({
      patientUserId: "patient-1",
      role: "DOCTOR",
      allergies: [],
      emergency: { clinicianCriticalFlag: true, criticalAlertsText: null },
      criticalLabs: [],
    });
    expect(flags).toEqual([
      { id: "emergency:patient-1", kind: "emergency", label: "Clinician critical flag" },
    ]);
  });

  it("prefers the emergency alert text over the default label", () => {
    const flags = buildCriticalFlags({
      patientUserId: "patient-1",
      role: "DOCTOR",
      allergies: [],
      emergency: { clinicianCriticalFlag: false, criticalAlertsText: " Anaphylaxis risk " },
      criticalLabs: [],
    });
    expect(flags).toEqual([
      { id: "emergency:patient-1", kind: "emergency", label: "Anaphylaxis risk" },
    ]);
  });

  it("omits the emergency flag when neither field is set", () => {
    const flags = buildCriticalFlags({
      patientUserId: "patient-1",
      role: "PATIENT",
      allergies: [],
      emergency: { clinicianCriticalFlag: false, criticalAlertsText: null },
      criticalLabs: [],
    });
    expect(flags).toEqual([]);
  });

  it("hides unreleased critical labs from patients (FR-013)", () => {
    const criticalLabs = [
      { id: "l1", title: "CBC", releaseStatus: "RELEASED" },
      { id: "l2", title: "Troponin", releaseStatus: "PENDING_REVIEW" },
    ];

    const patientFlags = buildCriticalFlags({
      patientUserId: "patient-1",
      role: "PATIENT",
      allergies: [],
      emergency: null,
      criticalLabs,
    });
    expect(patientFlags).toEqual([{ id: "lab:l1", kind: "lab", label: "CBC" }]);

    const doctorFlags = buildCriticalFlags({
      patientUserId: "patient-1",
      role: "DOCTOR",
      allergies: [],
      emergency: null,
      criticalLabs,
    });
    expect(doctorFlags.map((f) => f.id)).toEqual(["lab:l1", "lab:l2"]);
  });

  it("orders allergy, emergency, then lab flags", () => {
    const flags = buildCriticalFlags({
      patientUserId: "patient-1",
      role: "ADMIN",
      allergies: [{ id: "a1", substance: "Latex", criticalFlag: true }],
      emergency: { clinicianCriticalFlag: true, criticalAlertsText: null },
      criticalLabs: [{ id: "l1", title: "Potassium", releaseStatus: "RELEASED" }],
    });
    expect(flags.map((f) => f.kind)).toEqual(["allergy", "emergency", "lab"]);
  });
});
