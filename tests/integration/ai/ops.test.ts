/**
 * Integration: usage aggregates by feature/role/locale; budget notify-once +
 * hard-cap BUDGET_EXHAUSTED; dashboard totals reconcile with usage list.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiUsageEvent: {
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    aiGuardrailEvent: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    aiFeedback: {
      groupBy: vi.fn(),
    },
    aiCostBudget: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/admin/notify-admins", () => ({
  notifyAdmins: vi.fn(async () => undefined),
}));

import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/admin/notify-admins";
import { checkBudget } from "@/lib/ai/budgets";
import {
  getOpsDashboard,
  listUsage,
  percentileNearest,
} from "@/lib/ai/ops";

const mockUsage = prisma.aiUsageEvent as unknown as {
  count: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
  aggregate: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
};
const mockGuardrail = prisma.aiGuardrailEvent as unknown as {
  count: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
};
const mockFeedback = prisma.aiFeedback as unknown as {
  groupBy: ReturnType<typeof vi.fn>;
};
const mockBudget = prisma.aiCostBudget as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};
const mockNotify = vi.mocked(notifyAdmins);

const from = new Date("2026-08-01T00:00:00.000Z");
const to = new Date("2026-08-04T23:59:59.000Z");

describe("percentileNearest", () => {
  it("computes p50/p95 on sorted samples", () => {
    const samples = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentileNearest(samples, 50)).toBe(50);
    expect(percentileNearest(samples, 95)).toBe(100);
    expect(percentileNearest([], 50)).toBe(0);
  });
});

describe("getOpsDashboard aggregates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsage.count.mockResolvedValue(5);
    mockUsage.groupBy.mockImplementation(async (args: { by: string[] }) => {
      if (args.by[0] === "feature") {
        return [
          { feature: "PATIENT_ASSISTANT", _count: { _all: 3 }, _sum: { estimatedCostUsd: new Prisma.Decimal(0.03) } },
          { feature: "DOCTOR_SOAP", _count: { _all: 2 }, _sum: { estimatedCostUsd: new Prisma.Decimal(0.02) } },
        ];
      }
      if (args.by[0] === "role") {
        return [
          { role: "PATIENT", _count: { _all: 3 } },
          { role: "DOCTOR", _count: { _all: 2 } },
        ];
      }
      if (args.by[0] === "locale") {
        return [
          { locale: "EN", _count: { _all: 4 } },
          { locale: "AR", _count: { _all: 1 } },
        ];
      }
      if (args.by[0] === "outcome") {
        return [
          { outcome: "SUCCESS", _count: { _all: 3 } },
          { outcome: "ERROR", _count: { _all: 1 } },
          { outcome: "REFUSED", _count: { _all: 1 } },
        ];
      }
      return [];
    });
    mockUsage.aggregate.mockResolvedValue({
      _sum: { estimatedCostUsd: new Prisma.Decimal(0.05) },
    });
    mockUsage.findMany.mockResolvedValue([
      { latencyMs: 100 },
      { latencyMs: 200 },
      { latencyMs: 300 },
      { latencyMs: 400 },
      { latencyMs: 500 },
    ]);
    mockGuardrail.count.mockResolvedValue(2);
    mockGuardrail.groupBy.mockResolvedValue([
      { trigger: "RED_FLAG", _count: { _all: 2 } },
    ]);
    mockFeedback.groupBy.mockResolvedValue([
      { rating: "HELPFUL", _count: { _all: 3 } },
      { rating: "NOT_HELPFUL", _count: { _all: 1 } },
    ]);
    mockBudget.findMany.mockResolvedValue([]);
  });

  it("aggregates usage by feature/role/locale and rates", async () => {
    const dash = await getOpsDashboard({ from, to });

    expect(dash.usage.total).toBe(5);
    expect(dash.usage.byFeature).toEqual(
      expect.arrayContaining([
        { key: "PATIENT_ASSISTANT", count: 3 },
        { key: "DOCTOR_SOAP", count: 2 },
      ]),
    );
    expect(dash.usage.byRole).toEqual(
      expect.arrayContaining([
        { key: "PATIENT", count: 3 },
        { key: "DOCTOR", count: 2 },
      ]),
    );
    expect(dash.usage.byLocale).toEqual(
      expect.arrayContaining([
        { key: "EN", count: 4 },
        { key: "AR", count: 1 },
      ]),
    );
    expect(dash.cost.totalUsd).toBe(0.05);
    expect(dash.errors.errorRate).toBe(20);
    expect(dash.errors.refusalRate).toBe(20);
    expect(dash.latency.p50Ms).toBe(300);
    expect(dash.guardrails.total).toBe(2);
    expect(dash.feedback.helpfulRatio).toBe(75);
  });
});

describe("dashboard ↔ usage list reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reconciles cost totals between dashboard and usage list", async () => {
    mockUsage.count.mockResolvedValue(2);
    mockUsage.groupBy.mockResolvedValue([]);
    mockUsage.aggregate.mockResolvedValue({
      _sum: { estimatedCostUsd: new Prisma.Decimal("0.012500") },
    });
    mockUsage.findMany.mockResolvedValue([
      {
        id: "u1",
        feature: "PATIENT_ASSISTANT",
        role: "PATIENT",
        locale: "EN",
        promptTokens: 10,
        completionTokens: 20,
        latencyMs: 100,
        outcome: "SUCCESS",
        estimatedCostUsd: new Prisma.Decimal("0.007500"),
        createdAt: from,
      },
      {
        id: "u2",
        feature: "DOCTOR_SOAP",
        role: "DOCTOR",
        locale: "AR",
        promptTokens: 5,
        completionTokens: 5,
        latencyMs: 80,
        outcome: "SUCCESS",
        estimatedCostUsd: new Prisma.Decimal("0.005000"),
        createdAt: to,
      },
    ]);
    mockGuardrail.count.mockResolvedValue(0);
    mockGuardrail.groupBy.mockResolvedValue([]);
    mockFeedback.groupBy.mockResolvedValue([]);
    mockBudget.findMany.mockResolvedValue([]);

    const dash = await getOpsDashboard({ from, to });
    const listed = await listUsage({ from, to });

    expect(listed.totalCostUsd).toBe(dash.cost.totalUsd);
    expect(listed.total).toBe(dash.usage.total);
    expect(listed.items.every((row) => !("content" in row) && !("body" in row))).toBe(
      true,
    );
  });
});

describe("budget threshold notify-once + hard cap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("notifies once per period on threshold, then hard-caps with BUDGET_EXHAUSTED", async () => {
    const budgetRow = {
      id: "bud-1",
      scope: "GLOBAL" as const,
      feature: null,
      monthlyUsd: new Prisma.Decimal(100),
      alertThreshold: 80,
      hardCap: true,
      breachedAt: null as Date | null,
      updatedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockBudget.findFirst
      .mockResolvedValueOnce(null) // FEATURE lookup
      .mockResolvedValueOnce(budgetRow) // GLOBAL
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...budgetRow, breachedAt: new Date() })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...budgetRow, breachedAt: new Date() });

    mockUsage.aggregate
      .mockResolvedValueOnce({ _sum: { estimatedCostUsd: new Prisma.Decimal(85) } })
      .mockResolvedValueOnce({ _sum: { estimatedCostUsd: new Prisma.Decimal(85) } })
      .mockResolvedValueOnce({ _sum: { estimatedCostUsd: new Prisma.Decimal(100) } });

    mockBudget.update.mockResolvedValue({ ...budgetRow, breachedAt: new Date() });

    const alert = await checkBudget("PATIENT_ASSISTANT");
    expect(alert.ok).toBe(true);
    expect(mockNotify).toHaveBeenCalledTimes(1);

    const alertAgain = await checkBudget("PATIENT_ASSISTANT");
    expect(alertAgain.ok).toBe(true);
    expect(mockNotify).toHaveBeenCalledTimes(1);

    const blocked = await checkBudget("PATIENT_ASSISTANT");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("BUDGET_EXHAUSTED");
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });
});
