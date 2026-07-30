import type {
  CreateJoinTokenInput,
  CreateRoomInput,
  CreateRoomResult,
  JoinTokenResult,
  TelemedicinePort,
} from "@/ports/telemedicine";

export class StubTelemedicineAdapter implements TelemedicinePort {
  async createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
    return { roomId: `stub_room_${input.appointmentId}` };
  }

  async createJoinToken(input: CreateJoinTokenInput): Promise<JoinTokenResult> {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    return {
      token: `stub_token_${input.roomId}_${input.participantId}`,
      url: `https://stub-telemedicine.local/join/${input.roomId}?role=${input.role}`,
      expiresAt,
    };
  }

  async endRoom(_roomId: string): Promise<void> {
    // no-op in stub
  }
}

export const stubTelemedicineAdapter = new StubTelemedicineAdapter();
