import { describe, expect, it } from "vitest";
import { StubTelemedicineAdapter } from "@/adapters/stub-telemedicine";

describe("livekit/stub telemedicine adapter contract", () => {
  it("creates room and join token with expiry", async () => {
    const adapter = new StubTelemedicineAdapter();
    const room = await adapter.createRoom({
      appointmentId: "appt_1",
      patientUserId: "p1",
      doctorId: "d1",
    });
    expect(room.roomId).toContain("appt_1");
    const token = await adapter.createJoinToken({
      roomId: room.roomId,
      participantId: "p1",
      participantName: "Patient",
      role: "patient",
      ttlSeconds: 120,
    });
    expect(token.token).toContain("stub_token_");
    expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
    const ping = await adapter.ping?.();
    expect(ping).toBe(true);
  });
});
