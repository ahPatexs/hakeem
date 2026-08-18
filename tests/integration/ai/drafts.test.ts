/**
 * Integration-shaped draft lifecycle: generate (stubbed) → PENDING → accept →
 * EMR SOAP draft via facade with doctor actor + acceptedIntoId; discard path;
 * AI-cannot-sign invariant (accept never calls sign).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appointment: { findUnique: vi.fn() },
    aiDraftArtifact: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    soapNote: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/orchestration", () => ({
  generate: vi.fn(),
}));

vi.mock("@/lib/emr/notes", () => ({
  saveSoapDraft: vi.fn(),
  saveSummaryDraft: vi.fn(),
  signSoapNote: vi.fn(),
  finalizeClinicalSummary: vi.fn(),
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
import { saveSoapDraft, signSoapNote } from "@/lib/emr/notes";
import { checkBudget } from "@/lib/ai/budgets";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  acceptDraft,
  discardDraft,
  generateSoapDraft,
  parseSoapContent,
} from "@/lib/ai/drafts";

const mockHasCare = vi.mocked(hasCareRelationship);
const mockGenerate = vi.mocked(generate);
const mockSaveSoap = vi.mocked(saveSoapDraft);
const mockSignSoap = vi.mocked(signSoapNote);
const mockBudget = vi.mocked(checkBudget);
const mockRate = vi.mocked(checkAiRateLimit);
const mockApptFind = vi.mocked(prisma.appointment.findUnique);
const mockDraftCreate = vi.mocked(prisma.aiDraftArtifact.create);
const mockDraftFind = vi.mocked(prisma.aiDraftArtifact.findUnique);
const mockDraftUpdate = vi.mocked(prisma.aiDraftArtifact.update);
const mockSoapFindFirst = vi.mocked(prisma.soapNote.findFirst);

const doctor = {
  userId: "doc-user-1",
  role: "DOCTOR" as const,
  doctorId: "doctor-1",
};

const soapContent = {
  subjective: "Cough 3 days",
  objective: "Afebrile",
  assessment: "Viral URI",
  plan: "Supportive care",
};

describe("parseSoapContent", () => {
  it("parses JSON SOAP payloads", () => {
    expect(parseSoapContent(JSON.stringify(soapContent))).toEqual(soapContent);
  });
});

describe("AI draft lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasCare.mockResolvedValue(true);
    mockBudget.mockResolvedValue({
      ok: true,
      data: { allowed: true, budget: null, spentUsd: 0, utilizationPct: 0 },
    });
    mockRate.mockReturnValue({ ok: true, data: { allowed: true } });
    mockApptFind.mockResolvedValue({
      id: "appt-1",
      patientUserId: "patient-1",
      doctorId: "doctor-1",
    } as never);

    mockSoapFindFirst.mockResolvedValue(null);
  });

  it("generate (stub) → PENDING artifact with evidence", async () => {
    mockGenerate.mockResolvedValue({
      ok: true,
      data: {
        content: JSON.stringify(soapContent),
        disclaimer: "draft",
        usage: { promptTokens: 10, completionTokens: 20 },
        promptVersionId: "pv-1",
        modelConfigId: "mc-1",
        modelName: "stub",
        usedFallback: false,
        evidence: {
          chartCategories: ["allergies", "conditions"],
          kbSources: [{ title: "URI self-care", chunkId: "c1", locale: "en" }],
          mode: "PERSONALIZED",
        },
      },
    });
    mockDraftCreate.mockResolvedValue({
      id: "draft-1",
      kind: "SOAP",
      status: "PENDING",
    } as never);

    const result = await generateSoapDraft(doctor, {
      patientUserId: "patient-1",
      appointmentId: "appt-1",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.draftId).toBe("draft-1");
    expect(result.data.content).toEqual(soapContent);
    expect(result.data.evidence.kbSources).toEqual(["URI self-care"]);
    expect(mockDraftCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kind: "SOAP",
          status: "PENDING",
          doctorUserId: "doc-user-1",
          patientUserId: "patient-1",
        }),
      }),
    );
  });

  it("accept → EMR SOAP draft via facade with doctor actor + acceptedIntoId", async () => {
    mockDraftFind.mockResolvedValue({
      id: "draft-1",
      kind: "SOAP",
      status: "PENDING",
      doctorUserId: "doc-user-1",
      patientUserId: "patient-1",
      appointmentId: "appt-1",
      content: soapContent,
    } as never);
    mockSaveSoap.mockResolvedValue({
      ok: true,
      data: { noteId: "note-99", version: 1, savedAt: new Date() },
    });
    mockDraftUpdate.mockResolvedValue({
      id: "draft-1",
      status: "ACCEPTED",
      acceptedIntoId: "note-99",
    } as never);

    const result = await acceptDraft(doctor, { draftId: "draft-1" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.acceptedIntoId).toBe("note-99");
    expect(mockSaveSoap).toHaveBeenCalledWith(
      doctor,
      expect.objectContaining({
        appointmentId: "appt-1",
        aiAssisted: true,
        subjective: soapContent.subjective,
        assessment: soapContent.assessment,
      }),
    );
    expect(mockDraftUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACCEPTED",
          acceptedIntoId: "note-99",
        }),
      }),
    );
    expect(mockSignSoap).not.toHaveBeenCalled();
  });

  it("discard path marks DISCARDED without EMR write", async () => {
    mockDraftFind.mockResolvedValue({
      id: "draft-2",
      kind: "SOAP",
      status: "PENDING",
      doctorUserId: "doc-user-1",
      patientUserId: "patient-1",
      appointmentId: "appt-1",
      content: soapContent,
    } as never);
    mockDraftUpdate.mockResolvedValue({
      id: "draft-2",
      status: "DISCARDED",
    } as never);

    const result = await discardDraft(doctor, { draftId: "draft-2" });
    expect(result.ok).toBe(true);
    expect(mockSaveSoap).not.toHaveBeenCalled();
    expect(mockDraftUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "DISCARDED" },
      }),
    );
  });

  it("AI-cannot-sign invariant: accept never invokes signSoapNote", async () => {
    mockDraftFind.mockResolvedValue({
      id: "draft-3",
      kind: "SOAP",
      status: "PENDING",
      doctorUserId: "doc-user-1",
      patientUserId: "patient-1",
      appointmentId: "appt-1",
      content: soapContent,
    } as never);
    mockSaveSoap.mockResolvedValue({
      ok: true,
      data: { noteId: "note-1", version: 1, savedAt: new Date() },
    });
    mockDraftUpdate.mockResolvedValue({
      id: "draft-3",
      status: "ACCEPTED",
      acceptedIntoId: "note-1",
    } as never);

    await acceptDraft(doctor, { draftId: "draft-3" });
    expect(mockSignSoap).not.toHaveBeenCalled();
    expect(mockSaveSoap.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ aiAssisted: true }),
    );
  });
});
