/**
 * Integration-style symptom session state machine (stubbed orchestration).
 * Covers start → steps → outcome, mid-session red-flag EMERGENCY escalate-only,
 * and attach-to-booking authorization.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiSymptomSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    appointment: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/orchestration", () => ({
  generate: vi.fn(),
}));

vi.mock("@/lib/ai/budgets", () => ({
  checkBudget: vi.fn(async () => ({
    ok: true,
    data: { allowed: true, budget: null, spentUsd: 0, utilizationPct: 0 },
  })),
}));

vi.mock("@/lib/ai/metering", () => ({
  recordUsage: vi.fn(),
}));

vi.mock("@/lib/ai/audit", () => ({
  aiAudit: vi.fn(async () => undefined),
}));

vi.mock("@/lib/ai/guardrail-events", () => ({
  recordGuardrailEventAsync: vi.fn(),
  recordGuardrailEvent: vi.fn(),
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  checkAiRateLimit: vi.fn(() => ({ ok: true, data: { allowed: true } })),
}));

vi.mock("@/lib/ai/governance-gate", () => ({
  requireFeatureAi: vi.fn(async () => ({ ok: true, data: true as const })),
}));

import { prisma } from "@/lib/prisma";
import { generate } from "@/lib/ai/orchestration";
import { recordGuardrailEventAsync } from "@/lib/ai/guardrail-events";
import { applyEscalateOnly } from "@/lib/ai/symptom";
import {
  answerSymptomStep,
  attachSessionToBooking,
  startSymptomSession,
} from "@/lib/ai/symptom";

const mockPrisma = prisma as unknown as {
  aiSymptomSession: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  appointment: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const mockGenerate = vi.mocked(generate);
const mockGuardrail = vi.mocked(recordGuardrailEventAsync);

const patientActor = {
  userId: "patient-1",
  role: "PATIENT" as const,
};

describe("symptom session state machine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("start → clarifying step → outcome for a mild complaint", async () => {
    mockPrisma.aiSymptomSession.create.mockResolvedValue({
      id: "sess-1",
      patientUserId: "patient-1",
      locale: "EN",
      status: "IN_PROGRESS",
      steps: [],
      outcome: null,
      rationale: null,
      redFlagged: false,
      appointmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.aiSymptomSession.update.mockResolvedValue({});

    mockGenerate.mockResolvedValueOnce({
      ok: true,
      data: {
        content: '{"type":"question","question":"How long have you had the fever?"}',
        disclaimer: "disclaimer",
        promptVersionId: "pv-1",
        modelConfigId: "mc-1",
        modelName: "stub",
        usedFallback: false,
        evidence: { chartCategories: [], kbSources: [], mode: "GENERAL" },
      },
    });

    const started = await startSymptomSession(patientActor, {
      locale: "en",
      complaint: "Mild fever for a day",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.data.sessionId).toBe("sess-1");
    expect(started.data.nextQuestion).toMatch(/fever/i);
    expect(started.data.outcome).toBeUndefined();

    mockPrisma.aiSymptomSession.findUnique.mockResolvedValue({
      id: "sess-1",
      patientUserId: "patient-1",
      locale: "EN",
      status: "IN_PROGRESS",
      steps: [
        {
          question: "What symptoms are you experiencing?",
          answer: "Mild fever for a day",
          at: new Date().toISOString(),
        },
        {
          question: "How long have you had the fever?",
          answer: null,
          at: new Date().toISOString(),
        },
      ],
      outcome: null,
      rationale: null,
      redFlagged: false,
      appointmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockGenerate.mockResolvedValueOnce({
      ok: true,
      data: {
        content:
          '{"type":"outcome","kind":"SELF_CARE","rationale":"Mild fever often settles with rest and fluids."}',
        disclaimer: "disclaimer",
        promptVersionId: "pv-1",
        modelConfigId: "mc-1",
        modelName: "stub",
        usedFallback: false,
        evidence: { chartCategories: [], kbSources: [], mode: "GENERAL" },
      },
    });

    const answered = await answerSymptomStep(patientActor, {
      sessionId: "sess-1",
      answer: "About one day",
    });
    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    expect(answered.data.outcome?.kind).toBe("SELF_CARE");
    expect(answered.data.outcome?.disclaimer).toMatch(/not a medical diagnosis/i);
    expect(mockPrisma.aiSymptomSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED",
          outcome: "SELF_CARE",
        }),
      }),
    );
  });

  it("red-flag mid-session forces EMERGENCY (escalate-only)", async () => {
    // Deterministic unit of the escalate-only assertion used by the facade
    expect(applyEscalateOnly("SELF_CARE", true)).toBe("EMERGENCY");
    expect(applyEscalateOnly("URGENT", true)).toBe("EMERGENCY");

    mockPrisma.aiSymptomSession.findUnique.mockResolvedValue({
      id: "sess-2",
      patientUserId: "patient-1",
      locale: "EN",
      status: "IN_PROGRESS",
      steps: [
        {
          question: "What symptoms are you experiencing?",
          answer: "Feeling unwell",
          at: new Date().toISOString(),
        },
        {
          question: "Any other symptoms?",
          answer: null,
          at: new Date().toISOString(),
        },
      ],
      outcome: null,
      rationale: null,
      redFlagged: false,
      appointmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.aiSymptomSession.update.mockResolvedValue({});

    const answered = await answerSymptomStep(patientActor, {
      sessionId: "sess-2",
      answer: "I have severe chest pain and shortness of breath",
    });

    expect(answered.ok).toBe(true);
    if (!answered.ok) return;
    expect(answered.data.outcome?.kind).toBe("EMERGENCY");
    expect(answered.data.outcome?.rationale).toMatch(/emergency/i);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockGuardrail).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: "RED_FLAG", feature: "SYMPTOM_CHECKER" }),
    );
    expect(mockPrisma.aiSymptomSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "COMPLETED",
          outcome: "EMERGENCY",
          redFlagged: true,
        }),
      }),
    );
  });

  it("red-flag on intake completes immediately without waiting for clarifying steps", async () => {
    mockPrisma.aiSymptomSession.create.mockResolvedValue({
      id: "sess-3",
      patientUserId: "patient-1",
      locale: "EN",
      status: "IN_PROGRESS",
      steps: [],
      outcome: null,
      rationale: null,
      redFlagged: false,
      appointmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.aiSymptomSession.update.mockResolvedValue({});

    const started = await startSymptomSession(patientActor, {
      locale: "en",
      complaint: "Sudden chest pain and I can't breathe",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.data.outcome?.kind).toBe("EMERGENCY");
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("attach-to-booking requires patient's own appointment", async () => {
    mockPrisma.aiSymptomSession.findUnique.mockResolvedValue({
      id: "sess-4",
      patientUserId: "patient-1",
      locale: "EN",
      status: "COMPLETED",
      steps: [],
      outcome: "SELF_CARE",
      rationale: "Mild",
      redFlagged: false,
      appointmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockPrisma.appointment.findUnique.mockResolvedValueOnce({
      id: "appt-other",
      patientUserId: "someone-else",
    });

    const denied = await attachSessionToBooking(patientActor, {
      sessionId: "sess-4",
      appointmentId: "appt-other",
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.code).toBe("FORBIDDEN");

    mockPrisma.appointment.findUnique.mockResolvedValueOnce({
      id: "appt-own",
      patientUserId: "patient-1",
    });
    mockPrisma.aiSymptomSession.update.mockResolvedValue({});

    const ok = await attachSessionToBooking(patientActor, {
      sessionId: "sess-4",
      appointmentId: "appt-own",
    });
    expect(ok.ok).toBe(true);
    expect(mockPrisma.aiSymptomSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { appointmentId: "appt-own" },
      }),
    );
  });

  it("denies attach for non-owner session", async () => {
    mockPrisma.aiSymptomSession.findUnique.mockResolvedValue({
      id: "sess-5",
      patientUserId: "other-patient",
      locale: "EN",
      status: "COMPLETED",
      steps: [],
      outcome: "SEE_DOCTOR",
      rationale: "x",
      redFlagged: false,
      appointmentId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const denied = await attachSessionToBooking(patientActor, {
      sessionId: "sess-5",
      appointmentId: "appt-own",
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.code).toBe("FORBIDDEN");
  });
});
