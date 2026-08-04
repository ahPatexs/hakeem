export interface CreateRoomInput {
  appointmentId: string;
  patientUserId: string;
  doctorId: string;
  metadata?: Record<string, string>;
}

export interface CreateRoomResult {
  roomId: string;
  roomName?: string;
}

export interface CreateJoinTokenInput {
  roomId: string;
  participantId: string;
  participantName: string;
  role: "patient" | "doctor";
  ttlSeconds?: number;
}

export interface JoinTokenResult {
  token: string;
  url: string;
  expiresAt: Date;
}

export interface TelemedicinePort {
  createRoom(input: CreateRoomInput): Promise<CreateRoomResult>;
  createJoinToken(input: CreateJoinTokenInput): Promise<JoinTokenResult>;
  endRoom(roomId: string): Promise<void>;
  closeRoom?(input: { roomId: string }): Promise<void>;
  startRecording?(input: { roomId: string }): Promise<{ egressId: string }>;
  stopRecording?(input: { egressId: string }): Promise<void>;
  ping?(): Promise<boolean>;
}
