/**
 * Integration-style chat flow tests (stub/composition).
 * Pure helpers + lightly mocked prisma for persistence composition.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiConversation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    aiMessage: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/orchestration", () => ({
  generate: vi.fn(),
  streamGenerate: vi.fn(),
}));

vi.mock("@/lib/ai/budgets", () => ({
  checkBudget: vi.fn(async () => ({ ok: true, data: { allowed: true } })),
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

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(async () => true),
}));

import { prisma } from "@/lib/prisma";
import { generate } from "@/lib/ai/orchestration";
import { recordGuardrailEventAsync } from "@/lib/ai/guardrail-events";
import { recordUsage } from "@/lib/ai/metering";
import {
  assembleMessageWindow,
  buildRollingSummaryUpdate,
  MESSAGE_WINDOW_SIZE,
  redFlagNoticeText,
  runChatTurn,
} from "@/lib/ai/conversations";

const mockPrisma = prisma as unknown as {
  aiConversation: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  aiMessage: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const mockGenerate = vi.mocked(generate);
const mockGuardrail = vi.mocked(recordGuardrailEventAsync);
const mockUsage = vi.mocked(recordUsage);

const patientActor = {
  userId: "patient-1",
  role: "PATIENT" as const,
};

describe("AI chat flow helpers", () => {
  it("windows to last 12 dialog turns and prepends rolling summary", () => {
    const messages = Array.from({ length: 16 }, (_, i) => ({
      role: (i % 2 === 0 ? "USER" : "ASSISTANT") as "USER" | "ASSISTANT",
      content: `m${i}`,
    }));
    const window = assembleMessageWindow(messages, "earlier context", MESSAGE_WINDOW_SIZE);
    expect(window[0]?.content).toContain("earlier context");
    const dialogTurns = window.filter(
      (m) => !(m.role === "assistant" && m.content.startsWith("[Conversation summary")),
    );
    expect(dialogTurns).toHaveLength(MESSAGE_WINDOW_SIZE);
    expect(window.at(-1)?.content).toBe("m15");
  });

  it("builds rolling summary from overflow turns", () => {
    const summary = buildRollingSummaryUpdate("prev", [
      { role: "USER", content: "hello there friend" },
      { role: "ASSISTANT", content: "hi" },
      { role: "SYSTEM_NOTICE", content: "ignore me" },
    ]);
    expect(summary).toContain("prev");
    expect(summary).toContain("User: hello");
    expect(summary).toContain("Assistant: hi");
    expect(summary).not.toContain("ignore me");
  });

  it("returns bilingual red-flag notice text", () => {
    expect(redFlagNoticeText("en", "chest_pain")).toMatch(/emergency/i);
    expect(redFlagNoticeText("ar", "breathing")).toMatch(/طارئة/);
  });
});

describe("AI chat turn composition (stub orchestration)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.aiConversation.findUnique.mockResolvedValue({
      id: "conv-1",
      patientUserId: "patient-1",
      feature: "PATIENT_ASSISTANT",
      locale: "EN",
      title: null,
      status: "ACTIVE",
      rollingSummary: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPrisma.aiConversation.update.mockResolvedValue({});
    mockPrisma.aiMessage.findMany.mockResolvedValue([]);
  });

  it("persists assistant reply with promptVersionId and modelConfigId", async () => {
    mockPrisma.aiMessage.create
      .mockResolvedValueOnce({
        id: "um-1",
        conversationId: "conv-1",
        role: "USER",
        content: "What is a mild fever?",
        redFlagged: false,
        disclaimerShown: false,
        promptVersionId: null,
        modelConfigId: null,
        createdAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: "am-1",
        conversationId: "conv-1",
        role: "ASSISTANT",
        content: "General guidance…",
        redFlagged: false,
        disclaimerShown: true,
        promptVersionId: "pv-1",
        modelConfigId: "mc-1",
        createdAt: new Date(),
      });

    mockGenerate.mockResolvedValue({
      ok: true,
      data: {
        content: "General guidance…",
        disclaimer: "disclaimer",
        usage: { promptTokens: 10, completionTokens: 20 },
        promptVersionId: "pv-1",
        modelConfigId: "mc-1",
        modelName: "stub",
        usedFallback: false,
        evidence: { chartCategories: [], kbSources: [], mode: "GENERAL" },
      },
    });

    const result = await runChatTurn(patientActor, {
      conversationId: "conv-1",
      feature: "PATIENT_ASSISTANT",
      message: "What is a mild fever?",
      locale: "en",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.promptVersionId).toBe("pv-1");
    expect(result.data.modelConfigId).toBe("mc-1");
    expect(mockGenerate).toHaveBeenCalledOnce();
    expect(mockUsage).toHaveBeenCalled();
    expect(mockPrisma.aiMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "ASSISTANT",
          evidence: expect.objectContaining({ mode: "GENERAL", kbSources: [] }),
        }),
      }),
    );
  });

  it("short-circuits red-flag input without calling orchestration", async () => {
    mockPrisma.aiMessage.create
      .mockResolvedValueOnce({
        id: "um-2",
        conversationId: "conv-1",
        role: "USER",
        content: "crushing chest pain and I can't breathe",
        redFlagged: false,
        disclaimerShown: false,
        promptVersionId: null,
        modelConfigId: null,
        createdAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: "sn-1",
        conversationId: "conv-1",
        role: "SYSTEM_NOTICE",
        content: "emergency",
        redFlagged: true,
        disclaimerShown: true,
        promptVersionId: null,
        modelConfigId: null,
        createdAt: new Date(),
      });

    const result = await runChatTurn(patientActor, {
      conversationId: "conv-1",
      feature: "PATIENT_ASSISTANT",
      message: "crushing chest pain and I can't breathe",
      locale: "en",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.redFlagged).toBe(true);
    expect(mockGenerate).not.toHaveBeenCalled();
    expect(mockGuardrail).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: "RED_FLAG" }),
    );
  });
});
