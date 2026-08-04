/**
 * Security: draft generation denied without care relationship; patients cannot
 * see PENDING drafts; accept requires a doctor actor.
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
  },
}));

vi.mock("@/lib/ai/orchestration", () => ({
  generate: vi.fn(),
}));

vi.mock("@/lib/emr/notes", () => ({
  saveSoapDraft: vi.fn(),
  saveSummaryDraft: vi.fn(),
}));

vi.mock("@/lib/ai/audit", () => ({
  aiAudit: vi.fn(),
}));

vi.mock("@/lib/ai/metering", () => ({
  recordUsage: vi.fn(),
}));

vi.mock("@/lib/ai/budgets", () => ({
  checkBudget: vi.fn(async () => ({
    ok: true,
    data: { allowed: true, budget: null, spentUsd: 0, utilizationPct: 0 },
  })),
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  checkAiRateLimit: vi.fn(() => ({ ok: true, data: { allowed: true } })),
}));

import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { prisma } from "@/lib/prisma";
import { generate } from "@/lib/ai/orchestration";
import { saveSoapDraft } from "@/lib/emr/notes";
import {
  acceptDraft,
  generateSoapDraft,
  getDraft,
} from "@/lib/ai/drafts";

const mockHasCare = vi.mocked(hasCareRelationship);
const mockGenerate = vi.mocked(generate);
const mockSaveSoap = vi.mocked(saveSoapDraft);
const mockDraftFind = vi.mocked(prisma.aiDraftArtifact.findUnique);
const mockApptFind = vi.mocked(prisma.appointment.findUnique);

describe("AI drafts security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApptFind.mockResolvedValue({
      id: "appt-1",
      patientUserId: "patient-1",
      doctorId: "doctor-1",
    } as never);
  });

  it("denies draft generation without care relationship", async () => {
    mockHasCare.mockResolvedValue(false);

    const result = await generateSoapDraft(
      { userId: "doc-user", role: "DOCTOR", doctorId: "doctor-1" },
      { patientUserId: "patient-1", appointmentId: "appt-1" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("patient cannot see PENDING drafts", async () => {
    mockDraftFind.mockResolvedValue({
      id: "draft-pending",
      kind: "SOAP",
      status: "PENDING",
      doctorUserId: "doc-user",
      patientUserId: "patient-1",
      content: {},
    } as never);

    const result = await getDraft(
      { userId: "patient-1", role: "PATIENT" },
      "draft-pending",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });

  it("accept requires doctor actor", async () => {
    mockDraftFind.mockResolvedValue({
      id: "draft-1",
      kind: "SOAP",
      status: "PENDING",
      doctorUserId: "doc-user",
      patientUserId: "patient-1",
      appointmentId: "appt-1",
      content: {
        subjective: "s",
        objective: "o",
        assessment: "a",
        plan: "p",
      },
    } as never);

    const asPatient = await acceptDraft(
      { userId: "patient-1", role: "PATIENT" },
      { draftId: "draft-1" },
    );
    expect(asPatient.ok).toBe(false);
    if (!asPatient.ok) expect(asPatient.code).toBe("FORBIDDEN");
    expect(mockSaveSoap).not.toHaveBeenCalled();

    const asAdmin = await acceptDraft(
      { userId: "admin-1", role: "ADMIN" },
      { draftId: "draft-1" },
    );
    expect(asAdmin.ok).toBe(false);
    if (!asAdmin.ok) expect(asAdmin.code).toBe("FORBIDDEN");
  });
});
