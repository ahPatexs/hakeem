/**
 * Security: Rx suggest / CDS denied without care relationship (FORBIDDEN);
 * patient role denied entirely.
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
  checkBudget: vi.fn(async () => ({
    ok: true,
    data: { allowed: true, budget: null, spentUsd: 0, utilizationPct: 0 },
  })),
}));

vi.mock("@/lib/ai/rate-limit", () => ({
  checkAiRateLimit: vi.fn(() => ({ ok: true, data: { allowed: true } })),
}));

vi.mock("@/lib/ai/governance-gate", () => ({
  requireFeatureAi: vi.fn(async () => ({ ok: true, data: true as const })),
}));

import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { generate } from "@/lib/ai/orchestration";
import { buildAiChartContext } from "@/lib/emr/ai-context";
import {
  dismissCdsInsight,
  listCdsInsights,
  suggestPrescription,
} from "@/lib/ai/clinical-support";

const mockHasCare = vi.mocked(hasCareRelationship);
const mockGenerate = vi.mocked(generate);
const mockChart = vi.mocked(buildAiChartContext);

describe("AI clinical support security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies suggest without care relationship (FORBIDDEN)", async () => {
    mockHasCare.mockResolvedValue(false);

    const result = await suggestPrescription(
      { userId: "doc-user", role: "DOCTOR", doctorId: "doctor-1" },
      { patientUserId: "patient-1", intent: "antibiotic for infection" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockChart).not.toHaveBeenCalled();
  });

  it("denies CDS list without care relationship (FORBIDDEN)", async () => {
    mockHasCare.mockResolvedValue(false);

    const result = await listCdsInsights(
      { userId: "doc-user", role: "DOCTOR", doctorId: "doctor-1" },
      { patientUserId: "patient-1" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(mockChart).not.toHaveBeenCalled();
  });

  it("denies CDS dismiss without care relationship (FORBIDDEN)", async () => {
    mockHasCare.mockResolvedValue(false);

    const result = await dismissCdsInsight(
      { userId: "doc-user", role: "DOCTOR", doctorId: "doctor-1" },
      { insightId: "cds:allergy:penicillin", patientUserId: "patient-1" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("patient role denied entirely for suggest", async () => {
    const result = await suggestPrescription(
      { userId: "patient-1", role: "PATIENT" },
      { patientUserId: "patient-1", intent: "antibiotic for infection" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(mockHasCare).not.toHaveBeenCalled();
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("patient role denied entirely for CDS", async () => {
    const list = await listCdsInsights(
      { userId: "patient-1", role: "PATIENT" },
      { patientUserId: "patient-1" },
    );
    expect(list.ok).toBe(false);
    if (!list.ok) expect(list.code).toBe("FORBIDDEN");

    const dismiss = await dismissCdsInsight(
      { userId: "patient-1", role: "PATIENT" },
      { insightId: "cds:allergy:penicillin", patientUserId: "patient-1" },
    );
    expect(dismiss.ok).toBe(false);
    if (!dismiss.ok) expect(dismiss.code).toBe("FORBIDDEN");
  });
});
