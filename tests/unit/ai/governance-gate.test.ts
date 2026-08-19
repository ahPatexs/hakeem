import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/admin/maintenance", () => ({
  getPlatformSettingBoolean: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { getPlatformSettingBoolean } from "@/lib/admin/maintenance";
import { prisma } from "@/lib/prisma";
import { aiScopeForFeature } from "@/domain/admin/ai-governance";
import { requireFeatureAi } from "@/lib/ai/governance-gate";

describe("aiScopeForFeature", () => {
  it("maps chat and clinical features to the admin toggle scopes", () => {
    expect(aiScopeForFeature("PATIENT_ASSISTANT")).toBe("patient");
    expect(aiScopeForFeature("SYMPTOM_CHECKER")).toBe("patient");
    expect(aiScopeForFeature("RECOMMENDATIONS")).toBe("patient");
    expect(aiScopeForFeature("DOCTOR_SOAP")).toBe("doctorDocumentation");
    expect(aiScopeForFeature("DOCTOR_SUMMARY")).toBe("doctorDocumentation");
    expect(aiScopeForFeature("RX_ASSIST")).toBe("doctorPrescription");
    expect(aiScopeForFeature("CDS")).toBe("doctorPrescription");
  });
});

describe("requireFeatureAi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows when the global toggle is on and the user is not disabled", async () => {
    vi.mocked(getPlatformSettingBoolean).mockResolvedValue(true);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ aiDisabledAt: null } as never);
    const result = await requireFeatureAi("user-1", "PATIENT_ASSISTANT");
    expect(result.ok).toBe(true);
  });

  it("blocks when the admin global toggle is off", async () => {
    vi.mocked(getPlatformSettingBoolean).mockResolvedValue(false);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ aiDisabledAt: null } as never);
    const result = await requireFeatureAi("user-1", "PATIENT_ASSISTANT");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("blocks when the user AI is disabled", async () => {
    vi.mocked(getPlatformSettingBoolean).mockResolvedValue(true);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ aiDisabledAt: new Date() } as never);
    const result = await requireFeatureAi("user-1", "DOCTOR_SOAP");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
  });
});