import { describe, expect, it } from "vitest";
import {
  canJoinVideo,
  isAuthorizedVideoParticipant,
  type VideoAppointment,
} from "@/domain/platform/video";

describe("video party authorization", () => {
  it("allows patient and doctor participants", () => {
    expect(
      isAuthorizedVideoParticipant({
        actorUserId: "patient-1",
        patientUserId: "patient-1",
        doctorUserId: "doctor-1",
        appointmentStatus: "CONFIRMED",
      }),
    ).toBe(true);
    expect(
      isAuthorizedVideoParticipant({
        actorUserId: "doctor-1",
        patientUserId: "patient-1",
        doctorUserId: "doctor-1",
        appointmentStatus: "CONFIRMED",
      }),
    ).toBe(true);
  });

  it("denies strangers and cancelled appointments", () => {
    expect(
      isAuthorizedVideoParticipant({
        actorUserId: "stranger",
        patientUserId: "patient-1",
        doctorUserId: "doctor-1",
        appointmentStatus: "CONFIRMED",
      }),
    ).toBe(false);
    expect(
      isAuthorizedVideoParticipant({
        actorUserId: "patient-1",
        patientUserId: "patient-1",
        doctorUserId: "doctor-1",
        appointmentStatus: "CANCELLED",
      }),
    ).toBe(false);
  });
});

describe("video join window", () => {
  const appointment: VideoAppointment = {
    mode: "VIDEO",
    status: "CONFIRMED",
    startAt: new Date("2026-07-30T12:00:00Z"),
    endAt: new Date("2026-07-30T12:30:00Z"),
  };

  it("permits join inside window", () => {
    expect(canJoinVideo(appointment, new Date("2026-07-30T11:50:00Z"))).toBe(true);
    expect(canJoinVideo(appointment, new Date("2026-07-30T12:30:00Z"))).toBe(true);
  });

  it("denies join outside window or wrong mode", () => {
    expect(canJoinVideo(appointment, new Date("2026-07-30T10:00:00Z"))).toBe(false);
    expect(canJoinVideo({ ...appointment, mode: "IN_PERSON" })).toBe(false);
  });
});
