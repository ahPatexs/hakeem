export interface CreateRoomInput {
  appointmentId: string;
  patientUserId: string;
  doctorId: string;
}

export interface CreateRoomResult {
  roomId: string;
}

export interface CreateJoinTokenInput {
  roomId: string;
  participantId: string;
  participantName: string;
  role: "patient" | "doctor";
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
}
