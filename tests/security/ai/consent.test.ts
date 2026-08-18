/**
 * Consent-mode enforcement at context assembly (FR-030).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/emr/consents", () => ({
  requireConsent: vi.fn(),
}));

vi.mock("@/lib/emr/ai-context", () => ({
  buildAiChartContext: vi.fn(),
}));

vi.mock("@/adapters", () => ({
  getEmbeddingsAdapter: vi.fn(() => ({
    model: "stub",
    embed: vi.fn(async () => [[0.1, 0.2]]),
  })),
}));

vi.mock("@/lib/platform/ai", () => ({
  assertBaaGate: vi.fn(),
}));

vi.mock("@/lib/ai/guardrail-events", () => ({
  recordGuardrailEventAsync: vi.fn(),
}));

vi.mock("@/lib/ai/vector", () => ({
  searchKnowledge: vi.fn(async () => []),
  formatKbGrounding: vi.fn(() => ""),
}));

import { requireConsent } from "@/lib/emr/consents";
import { buildAiChartContext } from "@/lib/emr/ai-context";
import { recordGuardrailEventAsync } from "@/lib/ai/guardrail-events";
import { assembleContext } from "@/lib/ai/context";
import { platformFail, platformOk } from "@/domain/platform/outcomes";

const mockConsent = vi.mocked(requireConsent);
const mockChart = vi.mocked(buildAiChartContext);
const mockGuardrail = vi.mocked(recordGuardrailEventAsync);

const actor = { userId: "patient-1", role: "PATIENT" as const };

describe("consent mode at context assembly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PERSONALIZED mode includes chart when DATA_SHARING consent ok", async () => {
    mockConsent.mockResolvedValue(platformOk({ acknowledged: true }) as never);
    mockChart.mockResolvedValue(
      platformOk({
        patientUserId: "patient-1",
        allergies: [{ substance: "Penicillin", severity: "severe", criticalFlag: true }],
        conditions: [],
        activeMedications: [],
        releasedLabs: [],
        emergency: null,
        recentDiagnoses: [],
        bloodType: null,
        profileNotes: null,
        immunizations: [],
        upcomingVisits: [],
        recentVisitNotes: [],
      }) as never,
    );

    const result = await assembleContext(
      actor,
      "patient-1",
      "PATIENT_ASSISTANT",
      "en",
      "fever",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mode).toBe("PERSONALIZED");
    expect(result.data.evidence.chartCategories.length).toBeGreaterThan(0);
    expect(result.data.groundingText).toContain("<<<CHART_SNAPSHOT_DATA>>>");
    expect(mockChart).toHaveBeenCalled();
  });

  it("PATIENT_ASSISTANT includes the patient's own chart even without DATA_SHARING", async () => {
    mockConsent.mockResolvedValue(platformFail("CONSENT_REQUIRED", "missing") as never);
    mockChart.mockResolvedValue(
      platformOk({
        patientUserId: "patient-1",
        allergies: [{ substance: "Penicillin", severity: "severe", criticalFlag: true }],
        conditions: [],
        activeMedications: [],
        releasedLabs: [],
        emergency: null,
        recentDiagnoses: [],
        bloodType: null,
        profileNotes: null,
        immunizations: [],
        upcomingVisits: [],
        recentVisitNotes: [],
      }) as never,
    );

    const result = await assembleContext(
      actor,
      "patient-1",
      "PATIENT_ASSISTANT",
      "en",
      "fever",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mode).toBe("PERSONALIZED");
    expect(result.data.groundingText).toContain("<<<CHART_SNAPSHOT_DATA>>>");
    expect(result.data.groundingText).toContain("<<<KNOWLEDGE_BASE_DATA>>>");
    expect(mockChart).toHaveBeenCalled();
  });

  it("GENERAL mode skips chart and records CONSENT_BLOCK", async () => {
    mockConsent.mockResolvedValue(platformFail("CONSENT_REQUIRED", "missing") as never);

    const result = await assembleContext(
      actor,
      "patient-1",
      "RECOMMENDATIONS",
      "en",
      "fever",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.mode).toBe("GENERAL");
    expect(result.data.evidence.chartCategories).toEqual([]);
    expect(result.data.chart).toBeNull();
    expect(result.data.groundingText).not.toContain("<<<CHART_SNAPSHOT_DATA>>>");
    expect(mockChart).not.toHaveBeenCalled();
    expect(mockGuardrail).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: "CONSENT_BLOCK", category: "DATA_SHARING" }),
    );
  });
});
