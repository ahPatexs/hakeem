import { describe, expect, it } from "vitest";
import {
  canJoinVideo,
  canTransitionVideoSession,
  computeJoinTokenTtlSeconds,
  decodeVisitChatPayload,
  encodeVisitChatPayload,
  isAuthorizedVideoParticipant,
  isStubTelemedicineUrl,
  normalizeVisitChatBody,
  parseVisitChatMetadata,
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

  it("allows CHECKED_IN inside the join window", () => {
    expect(canJoinVideo({ ...appointment, status: "CHECKED_IN" }, new Date("2026-07-30T12:00:00Z"))).toBe(
      true,
    );
  });

  it("denies join outside window or wrong mode", () => {
    expect(canJoinVideo(appointment, new Date("2026-07-30T10:00:00Z"))).toBe(false);
    expect(canJoinVideo({ ...appointment, mode: "IN_PERSON" })).toBe(false);
  });
});

describe("video session state machine", () => {
  it("allows waiting to in_call and ends", () => {
    expect(canTransitionVideoSession("SCHEDULED", "WAITING")).toBe(true);
    expect(canTransitionVideoSession("WAITING", "IN_CALL")).toBe(true);
    expect(canTransitionVideoSession("IN_CALL", "ENDED")).toBe(true);
    expect(canTransitionVideoSession("ENDED", "IN_CALL")).toBe(false);
  });
});

describe("join token TTL", () => {
  it("caps at 2 hours and floors at 60s", () => {
    const far = computeJoinTokenTtlSeconds(new Date(Date.now() + 10 * 60 * 60 * 1000));
    expect(far).toBe(2 * 60 * 60);
    const near = computeJoinTokenTtlSeconds(new Date(Date.now() - 40 * 60 * 1000));
    expect(near).toBe(60);
  });
});

describe("stub url detection", () => {
  it("detects stub telemedicine urls", () => {
    expect(isStubTelemedicineUrl("https://stub-telemedicine.local/join/x")).toBe(true);
    expect(isStubTelemedicineUrl("wss://project.livekit.cloud")).toBe(false);
  });
});

describe("visit chat", () => {
  it("normalizes and caps message bodies", () => {
    expect(normalizeVisitChatBody("   hello   there  ")).toBe("hello there");
    expect(normalizeVisitChatBody("   ")).toBeNull();
    expect(normalizeVisitChatBody("x".repeat(1200))?.length).toBe(1000);
  });

  it("parses chat metadata and ignores webhook chat-meta events", () => {
    expect(
      parseVisitChatMetadata({
        type: "message",
        body: "Need the lab result",
        senderName: "Dr. Alaa Helal",
        role: "doctor",
      }),
    ).toEqual({
      type: "message",
      body: "Need the lab result",
      senderName: "Dr. Alaa Helal",
      role: "doctor",
    });
    expect(parseVisitChatMetadata({ providerEventType: "room_finished" })).toBeNull();
    expect(parseVisitChatMetadata({ type: "message", body: " ", role: "patient" })).toBeNull();
  });

  it("round-trips livekit chat payloads and ignores plain text", () => {
    const payload = encodeVisitChatPayload({
      id: "msg-1",
      body: "hi",
      senderName: "Demo Doctor",
      role: "doctor",
    });
    expect(decodeVisitChatPayload(payload)).toEqual({
      id: "msg-1",
      body: "hi",
      senderName: "Demo Doctor",
      role: "doctor",
    });
    expect(decodeVisitChatPayload("hi")).toBeNull();
  });
});
