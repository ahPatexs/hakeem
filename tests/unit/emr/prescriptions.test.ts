import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/domain/doctor/care-relationship", () => ({
  hasCareRelationship: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    prescription: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    prescriptionLine: {
      deleteMany: vi.fn(),
    },
    emrTimelineEvent: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/platform/audit", () => ({
  platformAudit: vi.fn(),
}));

import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { denyPatientPrescriptionMutation, renewPrescription } from "@/lib/emr/prescriptions";
import { prisma } from "@/lib/prisma";

const mockHasCare = vi.mocked(hasCareRelationship);
const mockFindFirst = vi.mocked(prisma.prescription.findFirst);
const mockCreate = vi.mocked(prisma.prescription.create);
const mockUpdate = vi.mocked(prisma.prescription.update);
const mockUpdateMany = vi.mocked(prisma.prescription.updateMany);
const mockTimelineUpsert = vi.mocked(prisma.emrTimelineEvent.upsert);

describe("denyPatientPrescriptionMutation", () => {
  it("denies patient-authored mutations", () => {
    const result = denyPatientPrescriptionMutation({ userId: "patient-1", role: "PATIENT" });
    expect(result).not.toBeNull();
    expect(result?.ok).toBe(false);
    if (result && !result.ok) expect(result.code).toBe("FORBIDDEN");
  });

  it("allows doctors and admins through (returns null)", () => {
    expect(
      denyPatientPrescriptionMutation({ userId: "doc-1", role: "DOCTOR", doctorId: "doctor-1" }),
    ).toBeNull();
    expect(denyPatientPrescriptionMutation({ userId: "admin-1", role: "ADMIN" })).toBeNull();
  });
});

describe("renewPrescription immutability", () => {
  const source = {
    id: "rx-source-1",
    patientUserId: "patient-1",
    appointmentId: "appt-1",
    medicationName: "Amoxicillin",
    instructions: "Take twice daily",
    status: "ACTIVE",
    lines: [
      {
        medicationName: "Amoxicillin",
        dose: "500mg",
        route: null,
        frequency: "BID",
        duration: "7d",
        quantity: "14",
        instructions: null,
      },
    ],
  };

  beforeEach(() => {
    mockHasCare.mockReset();
    mockFindFirst.mockReset();
    mockCreate.mockReset();
    mockUpdate.mockReset();
    mockUpdateMany.mockReset();
    mockTimelineUpsert.mockReset();
    mockTimelineUpsert.mockResolvedValue({} as never);
  });

  it("clones the source into a new DRAFT and never mutates the prior prescription", async () => {
    mockFindFirst.mockResolvedValue(source as never);
    mockHasCare.mockResolvedValue(true);
    mockCreate.mockResolvedValue({
      id: "rx-new-1",
      prescribedAt: new Date("2026-01-01T00:00:00.000Z"),
      medicationName: source.medicationName,
    } as never);

    const result = await renewPrescription(
      { userId: "doc-user-1", role: "DOCTOR", doctorId: "doctor-1" },
      { fromPrescriptionId: source.id },
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.prescriptionId).toBe("rx-new-1");

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createArgs = mockCreate.mock.calls[0][0] as {
      data: { status: string; renewedFromId: string; patientUserId: string };
    };
    expect(createArgs.data.status).toBe("DRAFT");
    expect(createArgs.data.renewedFromId).toBe(source.id);
    expect(createArgs.data.patientUserId).toBe(source.patientUserId);

    // The renewed-from prescription is cloned into a new row, never updated in place.
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects renewal by patients before touching the database (defense in depth)", async () => {
    const result = await renewPrescription(
      { userId: "patient-1", role: "PATIENT" },
      { fromPrescriptionId: source.id },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("FORBIDDEN");
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns NOT_FOUND when the source prescription cannot be renewed", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await renewPrescription(
      { userId: "doc-user-1", role: "DOCTOR", doctorId: "doctor-1" },
      { fromPrescriptionId: "missing-rx" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
