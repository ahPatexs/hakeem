import type {
  CreateJoinTokenInput,
  CreateRoomInput,
  CreateRoomResult,
  JoinTokenResult,
  TelemedicinePort,
} from "@/ports/telemedicine";

export class StubTelemedicineAdapter implements TelemedicinePort {
  async createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
    const roomId = `stub_room_${input.appointmentId}`;
    return { roomId, roomName: roomId };
  }

  async createJoinToken(input: CreateJoinTokenInput): Promise<JoinTokenResult> {
    const ttlSeconds = Math.max(60, Math.min(input.ttlSeconds ?? 3600, 2 * 60 * 60));
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    return {
      token: `stub_token_${input.roomId}_${input.participantId}_${input.role}`,
      url: `https://stub-telemedicine.local/join/${input.roomId}?role=${input.role}`,
      expiresAt,
    };
  }

  async endRoom(_roomId: string): Promise<void> {
    // no-op in stub
  }

  async closeRoom(_input: { roomId: string }): Promise<void> {
    // no-op in stub
  }

  async startRecording(input: { roomId: string }): Promise<{ egressId: string }> {
    return { egressId: `stub_egress_${input.roomId}` };
  }

  async stopRecording(_input: { egressId: string }): Promise<void> {
    // no-op in stub
  }

  async ping(): Promise<boolean> {
    return true;
  }
}

export const stubTelemedicineAdapter = new StubTelemedicineAdapter();
