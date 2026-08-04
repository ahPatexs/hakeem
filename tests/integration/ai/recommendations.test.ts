/**
 * Integration: personalized recommendations cite only patient-visible categories;
 * dismissal persists; no-data and no-consent paths return general wellness content.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiRecommendation: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    aiKnowledgeDoc: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/ai/context", () => ({
  assembleContext: vi.fn(),
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

vi.mock("@/lib/ai/rate-limit", () => ({
  checkAiRateLimit: vi.fn(() => ({ ok: true, data: { allowed: true } })),
}));

import { assembleContext } from "@/lib/ai/context";
import { prisma } from "@/lib/prisma";
import {
  PATIENT_VISIBLE_SOURCE_KINDS,
  dismissRecommendation,
  listEducationContent,
  listRecommendations,
  sanitizeSourceKinds,
} from "@/lib/ai/recommendations";

const mockPrisma = prisma as unknown as {
  aiRecommendation: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  aiKnowledgeDoc: {
    findMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockAssemble = vi.mocked(assembleContext);

const patientActor = {
  userId: "patient-1",
  role: "PATIENT" as const,
};

const chartWithCondition = {
  patientUserId: "patient-1",
  allergies: [],
  conditions: [{ display: "Type 2 diabetes", icd10Code: "E11", status: "ACTIVE" }],
  activeMedications: [],
  recentDiagnoses: [{ display: "Secret clinician note", icd10Code: null, recordedAt: new Date() }],
  emergency: null,
  releasedLabs: [],
};

describe("sanitizeSourceKinds", () => {
  it("keeps only patient-visible categories", () => {
    expect(sanitizeSourceKinds(["conditions", "recentDiagnoses", "notes"])).toEqual([
      "conditions",
    ]);
    for (const kind of sanitizeSourceKinds(["conditions", "allergies", "medications", "labs", "vitals"])) {
      expect(PATIENT_VISIBLE_SOURCE_KINDS.has(kind)).toBe(true);
    }
  });
});

describe("AI recommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.aiRecommendation.findMany.mockResolvedValue([]);
    mockPrisma.aiRecommendation.count.mockResolvedValue(0);
    mockPrisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
  });

  it("personalized generation cites only patient-visible categories", async () => {
    mockAssemble.mockResolvedValue({
      ok: true,
      data: {
        mode: "PERSONALIZED",
        groundingText: "",
        evidence: {
          chartCategories: ["conditions", "allergies", "medications", "labs"],
          kbSources: [],
          mode: "PERSONALIZED",
        },
        chart: chartWithCondition,
        kbHits: [],
      },
    });

    mockPrisma.aiRecommendation.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "rec-1",
      patientUserId: "patient-1",
      locale: "EN",
      title: data.title,
      body: data.body,
      reason: data.reason,
      sourceKinds: data.sourceKinds,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await listRecommendations(patientActor, { locale: "en" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.items.length).toBeGreaterThan(0);
    for (const item of result.data.items) {
      expect(item.reason.toLowerCase()).toMatch(/diabetes|profile|condition/);
      expect(item.reason.toLowerCase()).not.toMatch(/secret clinician/);
      for (const kind of item.sourceKinds) {
        expect(PATIENT_VISIBLE_SOURCE_KINDS.has(kind)).toBe(true);
      }
      expect(item.sourceKinds).not.toContain("recentDiagnoses");
    }

    expect(mockPrisma.aiRecommendation.create).toHaveBeenCalled();
    const createArg = mockPrisma.aiRecommendation.create.mock.calls[0]![0] as {
      data: { sourceKinds: string[] };
    };
    expect(createArg.data.sourceKinds.every((k) => PATIENT_VISIBLE_SOURCE_KINDS.has(k))).toBe(
      true,
    );
  });

  it("dismissal persists and stays dismissed on re-list", async () => {
    const activeRow = {
      id: "rec-dismiss",
      patientUserId: "patient-1",
      locale: "EN" as const,
      title: "Stay hydrated",
      body: "Drink water",
      reason: "General wellness",
      sourceKinds: [] as string[],
      status: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockPrisma.aiRecommendation.findMany.mockResolvedValueOnce([activeRow]);
    const listed = await listRecommendations(patientActor, { locale: "en" });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.data.items).toHaveLength(1);

    mockPrisma.aiRecommendation.findUnique.mockResolvedValue(activeRow);
    mockPrisma.aiRecommendation.update.mockResolvedValue({
      ...activeRow,
      status: "DISMISSED",
    });

    const dismissed = await dismissRecommendation(patientActor, {
      recommendationId: "rec-dismiss",
    });
    expect(dismissed.ok).toBe(true);
    expect(mockPrisma.aiRecommendation.update).toHaveBeenCalledWith({
      where: { id: "rec-dismiss" },
      data: { status: "DISMISSED" },
    });

    // Re-list: no ACTIVE rows; already generated today → empty, no regen
    mockPrisma.aiRecommendation.findMany.mockResolvedValueOnce([]);
    mockPrisma.aiRecommendation.count.mockResolvedValueOnce(1);
    const again = await listRecommendations(patientActor, { locale: "en" });
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.data.items).toHaveLength(0);
    expect(mockAssemble).not.toHaveBeenCalled();
  });

  it("no-consent path returns general wellness content", async () => {
    mockAssemble.mockResolvedValue({
      ok: true,
      data: {
        mode: "GENERAL",
        groundingText: "",
        evidence: { chartCategories: [], kbSources: [], mode: "GENERAL" },
        chart: null,
        kbHits: [],
      },
    });

    mockPrisma.aiRecommendation.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: `rec-${String(data.title).slice(0, 8)}`,
      patientUserId: "patient-1",
      locale: "EN",
      title: data.title,
      body: data.body,
      reason: data.reason,
      sourceKinds: data.sourceKinds ?? [],
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await listRecommendations(patientActor, { locale: "en" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.items.length).toBeGreaterThan(0);
    for (const item of result.data.items) {
      expect(item.sourceKinds).toEqual([]);
      expect(item.reason.toLowerCase()).toMatch(/general|wellness|not enough|not personalized/);
    }
  });

  it("no-data (empty chart) path returns general wellness content", async () => {
    mockAssemble.mockResolvedValue({
      ok: true,
      data: {
        mode: "PERSONALIZED",
        groundingText: "",
        evidence: {
          chartCategories: ["conditions"],
          kbSources: [],
          mode: "PERSONALIZED",
        },
        chart: {
          patientUserId: "patient-1",
          allergies: [],
          conditions: [],
          activeMedications: [],
          recentDiagnoses: [],
          emergency: null,
          releasedLabs: [],
        },
        kbHits: [],
      },
    });

    mockPrisma.aiRecommendation.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: "rec-gen",
      patientUserId: "patient-1",
      locale: "EN",
      title: data.title,
      body: data.body,
      reason: data.reason,
      sourceKinds: data.sourceKinds ?? [],
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await listRecommendations(patientActor, { locale: "en" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.items.length).toBeGreaterThan(0);
    for (const item of result.data.items) {
      expect(item.sourceKinds).toEqual([]);
      expect(item.reason.toLowerCase()).toMatch(/general|wellness|not enough|not personalized/);
    }
  });

  it("education list is locale-filtered", async () => {
    mockPrisma.aiKnowledgeDoc.findMany.mockResolvedValue([
      {
        id: "doc-1",
        slug: "wellness-sleep-en",
        title: "Healthy sleep habits",
        content: "Sleep well",
        kind: "wellness",
        locale: "EN",
      },
    ]);

    const result = await listEducationContent(patientActor, { locale: "en" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.items).toHaveLength(1);
    expect(mockPrisma.aiKnowledgeDoc.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ locale: "EN" }),
      }),
    );
  });

  it("denies non-patient actors", async () => {
    const doctor = { userId: "doc-1", role: "DOCTOR" as const, doctorId: "d1" };
    const result = await listRecommendations(doctor, { locale: "en" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("FORBIDDEN");
  });
});
