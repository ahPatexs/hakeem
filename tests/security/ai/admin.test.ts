/**
 * Security: admin AI actions deny PATIENT/DOCTOR; usage rows never include
 * message content fields.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/actions/ai/_actor", () => ({
  resolveAiActor: vi.fn(),
  toActionResult: (result: { ok: boolean; code?: string; data?: unknown }) =>
    result.ok ? { ok: true, data: result.data } : { ok: false, code: result.code },
}));

vi.mock("@/lib/ai/ops", () => ({
  getOpsDashboard: vi.fn(async () => ({
    usage: { total: 0, byFeature: [], byRole: [], byLocale: [] },
    cost: { totalUsd: 0, byFeature: [], budgets: [] },
    latency: { p50Ms: 0, p95Ms: 0 },
    errors: { total: 0, errorCount: 0, refusedCount: 0, errorRate: 0, refusalRate: 0 },
    guardrails: { total: 0, byTrigger: [] },
    feedback: { helpful: 0, notHelpful: 0, flagged: 0, helpfulRatio: 0 },
  })),
  listUsage: vi.fn(async () => ({
    items: [
      {
        id: "u1",
        feature: "PATIENT_ASSISTANT",
        role: "PATIENT",
        locale: "EN",
        promptTokens: 1,
        completionTokens: 2,
        latencyMs: 50,
        outcome: "SUCCESS",
        estimatedCostUsd: 0.001,
        createdAt: new Date(),
      },
    ],
    total: 1,
    totalCostUsd: 0.001,
  })),
  listGuardrailEvents: vi.fn(async () => ({ items: [], total: 0 })),
  listBudgets: vi.fn(async () => []),
}));

vi.mock("@/lib/ai/budgets", () => ({
  saveBudget: vi.fn(async () => ({ ok: true, data: { id: "bud-1" } })),
}));

vi.mock("@/lib/ai/audit", () => ({
  aiAudit: vi.fn(async () => undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { resolveAiActor } from "@/actions/ai/_actor";
import { listUsage } from "@/lib/ai/ops";
import {
  aiAdminGetGuardrailEvents,
  aiAdminGetOpsDashboard,
  aiAdminListUsage,
  aiAdminSaveBudget,
} from "@/actions/ai/admin";

const mockActor = vi.mocked(resolveAiActor);
const mockListUsage = vi.mocked(listUsage);

const period = {
  from: new Date("2026-08-01T00:00:00.000Z"),
  to: new Date("2026-08-04T23:59:59.000Z"),
};

describe("AI admin actions RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["PATIENT", "patient-1"],
    ["DOCTOR", "doctor-user"],
  ] as const)("denies %s for all admin ops actions", async (role, userId) => {
    mockActor.mockResolvedValue({
      ok: true,
      data: { userId, role, doctorId: role === "DOCTOR" ? "doc-1" : null },
    });

    const dash = await aiAdminGetOpsDashboard(period);
    const usage = await aiAdminListUsage(period);
    const budget = await aiAdminSaveBudget({
      scope: "GLOBAL",
      monthlyUsd: 50,
      alertThreshold: 80,
      hardCap: false,
    });
    const guardrails = await aiAdminGetGuardrailEvents(period);

    expect(dash).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(usage).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(budget).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(guardrails).toEqual({ ok: false, code: "FORBIDDEN" });
    expect(mockListUsage).not.toHaveBeenCalled();
  });

  it("allows ADMIN and returns usage without content fields", async () => {
    mockActor.mockResolvedValue({
      ok: true,
      data: { userId: "admin-1", role: "ADMIN" },
    });

    const usage = await aiAdminListUsage(period);
    expect(usage.ok).toBe(true);
    if (!usage.ok) return;

    for (const row of usage.data.items) {
      expect(row).not.toHaveProperty("content");
      expect(row).not.toHaveProperty("body");
      expect(row).not.toHaveProperty("message");
      expect(row).not.toHaveProperty("text");
      expect(Object.keys(row).sort()).toEqual(
        [
          "completionTokens",
          "createdAt",
          "estimatedCostUsd",
          "feature",
          "id",
          "latencyMs",
          "locale",
          "outcome",
          "promptTokens",
          "role",
        ].sort(),
      );
    }
  });
});
