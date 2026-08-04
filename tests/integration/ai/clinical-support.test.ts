/**
 * Integration: Rx suggestion for allergic patient includes ALLERGY conflict
 * with chart evidence; accept populates prescription draft only (never signs);
 * uncertain intent → explicit no-safe-suggestion response.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiDraftArtifact: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/orchestration", () => ({
  generate: vi.fn(),
}));

vi.mock("@/lib/emr/ai-context", () => ({
  buildAiChartContext: vi.fn(),
}));

vi.mock("@/lib/emr/prescriptions", () => ({
  savePrescriptionDraft: vi.fn(),
  signPrescription: vi.fn(),
}));

vi.mock("@/lib/platform/safety", () => ({
  runSafetyCheck: vi.fn(),
}));

vi.mock("@/lib/ai/audit", () => ({
  aiAudit: vi.fn(),
}));

vi.mock("@/lib/ai/metering", () => ({
  recordUsage: vi.fn(),
}));

vi.mock("@/lib/ai/budgets", () => ({
  checkBudget: vi.fn(),
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  checkAiRateLimit: vi.fn(),
}));

import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { generate } from "@/lib/ai/orchestration";
import { buildAiChartContext } from "@/lib/emr/ai-context";
import { savePrescriptionDraft, signPrescription } from "@/lib/emr/prescriptions";
import { runSafetyCheck } from "@/lib/platform/safety";
import { checkBudget } from "@/lib/ai/budgets";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  acceptRxDraft,
  resolveRxFromIntent,
  suggestPrescription,
} from "@/lib/ai/clinical-support";
import { acceptDraft } from "@/lib/ai/drafts";

const mockHasCare = vi.mocked(hasCareRelationship);
const mockGenerate = vi.mocked(generate);
const mockChart = vi.mocked(buildAiChartContext);
const mockSaveRx = vi.mocked(savePrescriptionDraft);
const mockSignRx = vi.mocked(signPrescription);
const mockSafety = vi.mocked(runSafetyCheck);
const mockBudget = vi.mocked(checkBudget);
const mockRate = vi.mocked(checkAiRateLimit);
const mockDraftCreate = vi.mocked(prisma.aiDraftArtifact.create);
const mockDraftFind = vi.mocked(prisma.aiDraftArtifact.findUnique);
const mockDraftUpdate = vi.mocked(prisma.aiDraftArtifact.update);

const doctor = {
  userId: "doc-user-1",
  role: "DOCTOR" as const,
  doctorId: "doctor-1",
};

const penicillinChart = {
  patientUserId: "patient-1",
  allergies: [{ substance: "Penicillin", severity: "SEVERE", criticalFlag: true }],
  conditions: [],
  activeMedications: [],
  recentDiagnoses: [],
  emergency: null,
  releasedLabs: [],
};

describe("resolveRxFromIntent", () => {
  it("maps antibiotic intent to Amoxicillin", () => {
    const rx = resolveRxFromIntent("oral antibiotic for bacterial sinusitis");
    expect(rx?.lines[0]?.medicationName).toBe("Amoxicillin");
  });

  it("returns null for uncertain intent", () => {
    expect(resolveRxFromIntent("??")).toBeNull();
    expect(resolveRxFromIntent("unsure")).toBeNull();
  });
});

describe("AI clinical support — Rx assistance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasCare.mockResolvedValue(true);
    mockBudget.mockResolvedValue({
      ok: true,
      data: { allowed: true, budget: null, spentUsd: 0, utilizationPct: 0 },
    });
    mockRate.mockReturnValue({ ok: true, data: { allowed: true } });
    mockChart.mockResolvedValue({ ok: true, data: penicillinChart });
    mockSafety.mockResolvedValue({
      allergyMatches: ["Amoxicillin"],
      highSeverityInteractions: [],
      allergyDataUnavailable: false,
      partial: true,
    });
  });

  it("suggestion for allergic patient includes ALLERGY conflict with evidence", async () => {
    mockGenerate.mockResolvedValue({
      ok: true,
      data: {
        content: JSON.stringify({
          lines: [{ medicationName: "Amoxicillin", dose: "500 mg", frequency: "TID" }],
        }),
        disclaimer: "draft",
        usage: { promptTokens: 10, completionTokens: 20 },
        promptVersionId: "pv-1",
        modelConfigId: "mc-1",
        modelName: "stub",
        usedFallback: false,
        evidence: {
          chartCategories: ["allergies"],
          kbSources: [{ title: "Antibiotic stewardship", chunkId: "c1", locale: "en" }],
          mode: "PERSONALIZED",
        },
      },
    });
    mockDraftCreate.mockResolvedValue({
      id: "rx-draft-1",
      kind: "RX_SUGGESTION",
      status: "PENDING",
    } as never);

    const result = await suggestPrescription(doctor, {
      patientUserId: "patient-1",
      intent: "antibiotic for suspected bacterial infection",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.noSafeSuggestion).toBe(false);
    if (result.data.noSafeSuggestion) return;

    expect(result.data.draftId).toBe("rx-draft-1");
    expect(result.data.content.lines[0]?.medicationName).toBe("Amoxicillin");
    expect(result.data.conflicts.some((c) => c.kind === "ALLERGY")).toBe(true);
    const allergy = result.data.conflicts.find((c) => c.kind === "ALLERGY");
    expect(allergy?.evidence).toMatch(/Penicillin/i);
    expect(mockDraftCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "RX_SUGGESTION",
          status: "PENDING",
          conflicts: expect.arrayContaining([
            expect.objectContaining({ kind: "ALLERGY" }),
          ]),
        }),
      }),
    );
  });

  it("accept populates prescription draft only (never signs)", async () => {
    const content = {
      lines: [{ medicationName: "Amoxicillin", dose: "500 mg", frequency: "TID" }],
      instructions: "Complete course",
    };
    mockDraftFind.mockResolvedValue({
      id: "rx-draft-1",
      kind: "RX_SUGGESTION",
      status: "PENDING",
      doctorUserId: "doc-user-1",
      patientUserId: "patient-1",
      appointmentId: null,
      content,
      conflicts: [{ kind: "ALLERGY", detail: "x", evidence: "Penicillin" }],
    } as never);
    mockSaveRx.mockResolvedValue({
      ok: true,
      data: { prescriptionId: "rx-99", version: 1 },
    });
    mockDraftUpdate.mockResolvedValue({
      id: "rx-draft-1",
      status: "ACCEPTED",
      acceptedIntoId: "rx-99",
    } as never);

    const viaFacade = await acceptRxDraft(doctor, { draftId: "rx-draft-1" });
    expect(viaFacade.ok).toBe(true);
    if (!viaFacade.ok) return;
    expect(viaFacade.data.acceptedIntoId).toBe("rx-99");
    expect(mockSaveRx).toHaveBeenCalledWith(
      doctor,
      expect.objectContaining({
        patientUserId: "patient-1",
        aiAssisted: true,
        lines: expect.arrayContaining([
          expect.objectContaining({ medicationName: "Amoxicillin" }),
        ]),
      }),
    );
    expect(mockSignRx).not.toHaveBeenCalled();

    // aiAcceptDraft bridge (drafts.acceptDraft → clinical-support)
    mockDraftFind.mockResolvedValue({
      id: "rx-draft-2",
      kind: "RX_SUGGESTION",
      status: "PENDING",
      doctorUserId: "doc-user-1",
      patientUserId: "patient-1",
      appointmentId: null,
      content,
    } as never);
    mockSaveRx.mockResolvedValue({
      ok: true,
      data: { prescriptionId: "rx-100", version: 1 },
    });
    mockDraftUpdate.mockResolvedValue({
      id: "rx-draft-2",
      status: "ACCEPTED",
      acceptedIntoId: "rx-100",
    } as never);

    const viaAcceptDraft = await acceptDraft(doctor, { draftId: "rx-draft-2" });
    expect(viaAcceptDraft.ok).toBe(true);
    expect(mockSignRx).not.toHaveBeenCalled();
  });

  it("uncertain input → explicit no-safe-suggestion response", async () => {
    const result = await suggestPrescription(doctor, {
      patientUserId: "patient-1",
      intent: "???",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.noSafeSuggestion).toBe(true);
    if (!result.data.noSafeSuggestion) return;
    expect(result.data.reason).toMatch(/uncertain/i);
    expect(mockDraftCreate).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });
});
