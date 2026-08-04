import {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
} from "livekit-server-sdk";
import type {
  CreateJoinTokenInput,
  CreateRoomInput,
  CreateRoomResult,
  JoinTokenResult,
  TelemedicinePort,
} from "@/ports/telemedicine";
import { requireHttpsUrl } from "@/lib/platform/https";

function requireLiveKitConfig(): { url: string; apiKey: string; apiSecret: string } {
  const url = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) {
    throw new Error("LIVEKIT_CONFIG_MISSING");
  }
  requireHttpsUrl(url);
  return { url, apiKey, apiSecret };
}

function roomNameFor(appointmentId: string): string {
  return `appt_${appointmentId}`;
}

export class LiveKitTelemedicineAdapter implements TelemedicinePort {
  private rooms(): RoomServiceClient {
    const { url, apiKey, apiSecret } = requireLiveKitConfig();
    return new RoomServiceClient(url, apiKey, apiSecret);
  }

  private egress(): EgressClient {
    const { url, apiKey, apiSecret } = requireLiveKitConfig();
    return new EgressClient(url, apiKey, apiSecret);
  }

  async createRoom(input: CreateRoomInput): Promise<CreateRoomResult> {
    const name = roomNameFor(input.appointmentId);
    const client = this.rooms();
    try {
      await client.createRoom({
        name,
        emptyTimeout: 60 * 60,
        maxParticipants: 4,
        metadata: JSON.stringify({
          appointmentId: input.appointmentId,
          patientUserId: input.patientUserId,
          doctorId: input.doctorId,
          ...(input.metadata ?? {}),
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/already exists|conflict/i.test(message)) {
        throw error;
      }
    }
    return { roomId: name, roomName: name };
  }

  async createJoinToken(input: CreateJoinTokenInput): Promise<JoinTokenResult> {
    const { url, apiKey, apiSecret } = requireLiveKitConfig();
    const ttlSeconds = Math.max(60, Math.min(input.ttlSeconds ?? 2 * 60 * 60, 2 * 60 * 60));
    const at = new AccessToken(apiKey, apiSecret, {
      identity: input.participantId,
      name: input.participantName,
      ttl: ttlSeconds,
      metadata: JSON.stringify({ role: input.role }),
    });
    at.addGrant({
      roomJoin: true,
      room: input.roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    return {
      token,
      url,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000),
    };
  }

  async endRoom(roomId: string): Promise<void> {
    await this.closeRoom({ roomId });
  }

  async closeRoom(input: { roomId: string }): Promise<void> {
    try {
      await this.rooms().deleteRoom(input.roomId);
    } catch {
      // Room may already be empty/deleted.
    }
  }

  async startRecording(input: { roomId: string }): Promise<{ egressId: string }> {
    const output = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: `recordings/${input.roomId}/{time}.mp4`,
    });
    const info = await this.egress().startRoomCompositeEgress(input.roomId, output, {
      layout: "speaker",
    });
    if (!info.egressId) {
      throw new Error("LIVEKIT_EGRESS_FAILED");
    }
    return { egressId: info.egressId };
  }

  async stopRecording(input: { egressId: string }): Promise<void> {
    await this.egress().stopEgress(input.egressId);
  }

  async ping(): Promise<boolean> {
    try {
      requireLiveKitConfig();
      await this.rooms().listRooms();
      return true;
    } catch {
      return false;
    }
  }
}

export const liveKitTelemedicineAdapter = new LiveKitTelemedicineAdapter();
