/**
 * Conversation ownership RBAC matrix (patient A vs B, doctor, admin).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiConversation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    aiMessage: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/audit", () => ({
  aiAudit: vi.fn(async () => undefined),
}));

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(async () => false),
}));

import { prisma } from "@/lib/prisma";
import {
  assertConversationOwner,
  getConversation,
  hideConversation,
  listConversations,
  renameConversation,
} from "@/lib/ai/conversations";

const mockPrisma = prisma as unknown as {
  aiConversation: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  aiMessage: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const convOwnedByA = {
  id: "conv-a",
  patientUserId: "patient-a",
  feature: "PATIENT_ASSISTANT" as const,
  locale: "EN" as const,
  title: "Fever",
  status: "ACTIVE" as const,
  rollingSummary: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("assertConversationOwner", () => {
  it("allows owning patient", () => {
    const result = assertConversationOwner(
      { userId: "patient-a", role: "PATIENT" },
      convOwnedByA,
    );
    expect(result.ok).toBe(true);
  });

  it("denies other patient", () => {
    const result = assertConversationOwner(
      { userId: "patient-b", role: "PATIENT" },
      convOwnedByA,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("denies doctor", () => {
    const result = assertConversationOwner(
      { userId: "doc-user", role: "DOCTOR", doctorId: "doc-1" },
      convOwnedByA,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("denies admin", () => {
    const result = assertConversationOwner(
      { userId: "admin-1", role: "ADMIN" },
      convOwnedByA,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("returns NOT_FOUND when conversation missing", () => {
    const result = assertConversationOwner(
      { userId: "patient-a", role: "PATIENT" },
      null,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
  });
});

describe("conversation facades ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listConversations is patient-only", async () => {
    const doctor = await listConversations({
      userId: "doc",
      role: "DOCTOR",
      doctorId: "d1",
    });
    expect(doctor.ok).toBe(false);
    if (!doctor.ok) expect(doctor.code).toBe("FORBIDDEN");

    mockPrisma.aiConversation.count.mockResolvedValue(0);
    mockPrisma.aiConversation.findMany.mockResolvedValue([]);
    const patient = await listConversations({ userId: "patient-a", role: "PATIENT" });
    expect(patient.ok).toBe(true);
    expect(mockPrisma.aiConversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ patientUserId: "patient-a", status: "ACTIVE" }),
      }),
    );
  });

  it("getConversation denies patient B for patient A conversation", async () => {
    mockPrisma.aiConversation.findUnique.mockResolvedValue(convOwnedByA);
    const result = await getConversation(
      { userId: "patient-b", role: "PATIENT" },
      { conversationId: "conv-a" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(mockPrisma.aiMessage.findMany).not.toHaveBeenCalled();
  });

  it("rename/hide deny doctor and admin", async () => {
    mockPrisma.aiConversation.findUnique.mockResolvedValue(convOwnedByA);

    const renameDoc = await renameConversation(
      { userId: "doc", role: "DOCTOR", doctorId: "d1" },
      { conversationId: "conv-a", title: "Hack" },
    );
    expect(renameDoc.ok).toBe(false);

    const hideAdmin = await hideConversation(
      { userId: "admin", role: "ADMIN" },
      { conversationId: "conv-a" },
    );
    expect(hideAdmin.ok).toBe(false);
    expect(mockPrisma.aiConversation.update).not.toHaveBeenCalled();
  });

  it("owner can hide conversation", async () => {
    mockPrisma.aiConversation.findUnique.mockResolvedValue(convOwnedByA);
    mockPrisma.aiConversation.update.mockResolvedValue({ ...convOwnedByA, status: "HIDDEN" });
    const result = await hideConversation(
      { userId: "patient-a", role: "PATIENT" },
      { conversationId: "conv-a" },
    );
    expect(result.ok).toBe(true);
    expect(mockPrisma.aiConversation.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "HIDDEN" },
      }),
    );
  });
});
