import { describe, expect, it } from "vitest";
import {
  HOLD_MS,
  CANCEL_WINDOW_MS,
  canCancel,
  canReschedule,
} from "@/domain/patient/appointments";
import { canJoinVideo } from "@/domain/patient/video";
import { isVisibleToPatient } from "@/domain/patient/labs";
import { isActivePrescription } from "@/domain/patient/prescriptions";

describe("appointment domain", () => {
  it("uses 10m hold and 12h cancel window", () => {
    expect(HOLD_MS).toBe(10 * 60 * 1000);
    expect(CANCEL_WINDOW_MS).toBe(12 * 60 * 60 * 1000);
  });

  it("blocks cancel inside 12h", () => {
    const startAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    expect(canCancel({ status: "CONFIRMED", startAt }, new Date())).toBe(false);
    const later = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(canCancel({ status: "CONFIRMED", startAt: later }, new Date())).toBe(true);
  });

  it("allows reschedule with same window as cancel", () => {
    const startAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(canReschedule({ status: "CONFIRMED", startAt }, new Date())).toBe(true);
  });
});

describe("video join window", () => {
  it("allows join from -15m to +60m", () => {
    const startAt = new Date(Date.now() + 5 * 60 * 1000);
    const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
    expect(canJoinVideo({ status: "CONFIRMED", mode: "VIDEO", startAt, endAt }, new Date())).toBe(
      true,
    );
    const far = new Date(Date.now() + 2 * 60 * 60 * 1000);
    expect(
      canJoinVideo(
        { status: "CONFIRMED", mode: "VIDEO", startAt: far, endAt: new Date(far.getTime() + 1) },
        new Date(),
      ),
    ).toBe(false);
    expect(canJoinVideo({ status: "CONFIRMED", mode: "IN_PERSON", startAt, endAt }, new Date())).toBe(
      false,
    );
  });
});

describe("clinical visibility", () => {
  it("shows only RELEASED labs", () => {
    expect(isVisibleToPatient({ releaseStatus: "RELEASED" })).toBe(true);
    expect(isVisibleToPatient({ releaseStatus: "PENDING_REVIEW" })).toBe(false);
    expect(isVisibleToPatient({ releaseStatus: "RETRACTED" })).toBe(false);
  });

  it("detects active prescriptions", () => {
    expect(
      isActivePrescription({
        status: "ACTIVE",
        endsAt: new Date(Date.now() + 86400000),
      }),
    ).toBe(true);
    expect(
      isActivePrescription({
        status: "ACTIVE",
        endsAt: new Date(Date.now() - 86400000),
      }),
    ).toBe(false);
  });
});
