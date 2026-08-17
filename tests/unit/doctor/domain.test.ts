import { describe, expect, it } from "vitest";
import { DOCTOR_DASHBOARD_CAPS, AI_RATE_LIMIT_PER_HOUR } from "@/domain/doctor/dashboard";
import {
  assertCanStart,
  assertCanComplete,
  assertCanMarkNoShow,
  isTerminalForClinicalWork,
} from "@/domain/doctor/consultation";
import { DomainRuleError } from "@/domain/doctor/errors";
import { assertSafeToSign, assertHasLines } from "@/domain/doctor/prescriptions";
import { assertSoapFinalizable, soapFinalizeWarnings, isLateAmendment, formatPatientFacingVisitNotes } from "@/domain/doctor/soap";

describe("doctor dashboard caps", () => {
  it("enforces widget limits from clarifications", () => {
    expect(DOCTOR_DASHBOARD_CAPS.todayAppointments).toBe(8);
    expect(DOCTOR_DASHBOARD_CAPS.upcomingConsultations).toBe(5);
    expect(DOCTOR_DASHBOARD_CAPS.pendingNotes).toBe(5);
    expect(DOCTOR_DASHBOARD_CAPS.recentPatients).toBe(5);
    expect(DOCTOR_DASHBOARD_CAPS.notificationPreview).toBe(5);
    expect(AI_RATE_LIMIT_PER_HOUR).toBe(30);
  });
});

describe("consultation lifecycle", () => {
  it("allows start from CONFIRMED or CHECKED_IN only", () => {
    expect(() => assertCanStart("CONFIRMED")).not.toThrow();
    expect(() => assertCanStart("CHECKED_IN")).not.toThrow();
    expect(() => assertCanStart("IN_PROGRESS")).toThrow(DomainRuleError);
    expect(() => assertCanStart("COMPLETED")).toThrow(DomainRuleError);
  });

  it("allows complete only from IN_PROGRESS", () => {
    expect(() => assertCanComplete("IN_PROGRESS")).not.toThrow();
    expect(() => assertCanComplete("CHECKED_IN")).toThrow(DomainRuleError);
  });

  it("allows no-show from waiting states", () => {
    expect(() => assertCanMarkNoShow("CONFIRMED")).not.toThrow();
    expect(() => assertCanMarkNoShow("CHECKED_IN")).not.toThrow();
    expect(() => assertCanMarkNoShow("IN_PROGRESS")).toThrow(DomainRuleError);
  });

  it("marks cancelled/no-show as terminal for clinical work", () => {
    expect(isTerminalForClinicalWork("CANCELLED")).toBe(true);
    expect(isTerminalForClinicalWork("NO_SHOW")).toBe(true);
    expect(isTerminalForClinicalWork("IN_PROGRESS")).toBe(false);
  });
});

describe("SOAP finalize", () => {
  it("requires assessment and plan", () => {
    expect(() =>
      assertSoapFinalizable({ subjective: "", objective: "", assessment: "", plan: "x" }),
    ).toThrow(DomainRuleError);
    expect(() =>
      assertSoapFinalizable({ subjective: "", objective: "", assessment: "A", plan: "P" }),
    ).not.toThrow();
  });

  it("warns on empty S/O", () => {
    expect(
      soapFinalizeWarnings({ subjective: "", objective: "", assessment: "A", plan: "P" }),
    ).toEqual(["subjective", "objective"]);
  });

  it("flags late amendments after 72h", () => {
    const signed = new Date(Date.now() - 73 * 60 * 60 * 1000);
    expect(isLateAmendment(signed)).toBe(true);
    expect(isLateAmendment(new Date())).toBe(false);
  });

  it("formats patient-facing visit notes from assessment and plan", () => {
    expect(
      formatPatientFacingVisitNotes("en", { assessment: "Gingivitis", plan: "Rinse twice daily" }),
    ).toBe("Assessment\nGingivitis\n\nPlan\nRinse twice daily");
    expect(
      formatPatientFacingVisitNotes("ar", { assessment: "التهاب لثة", plan: "مضمضة" }),
    ).toContain("التقييم");
  });
});

describe("prescription safety", () => {
  it("requires medication lines", () => {
    expect(() => assertHasLines([])).toThrow(DomainRuleError);
    expect(() => assertHasLines([{ medicationName: "Amoxicillin" }])).not.toThrow();
  });

  it("blocks hard allergy matches", () => {
    expect(() =>
      assertSafeToSign(
        {
          allergyMatches: ["Penicillin"],
          highSeverityInteractions: [],
          allergyDataUnavailable: false,
          partial: false,
        },
        {},
      ),
    ).toThrow(DomainRuleError);
  });

  it("requires acknowledgement when allergy data unavailable", () => {
    expect(() =>
      assertSafeToSign(
        { allergyMatches: [], highSeverityInteractions: [], allergyDataUnavailable: true, partial: true },
        {},
      ),
    ).toThrow(DomainRuleError);
    expect(() =>
      assertSafeToSign(
        { allergyMatches: [], highSeverityInteractions: [], allergyDataUnavailable: true, partial: true },
        { allergyDataUnavailableAck: true },
      ),
    ).not.toThrow();
  });
});
