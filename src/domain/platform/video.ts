export {
  canJoinVideo,
  getJoinWindow,
  JOIN_WINDOW_AFTER_MS,
  JOIN_WINDOW_BEFORE_MS,
  type VideoAppointment,
} from "@/domain/patient/video";

export type VideoPartyContext = {
  actorUserId: string;
  patientUserId: string;
  doctorUserId: string;
  appointmentStatus: string;
};

const BLOCKED_STATUSES = new Set(["CANCELLED", "COMPLETED", "NO_SHOW"]);

export function isAuthorizedVideoParticipant(ctx: VideoPartyContext): boolean {
  if (BLOCKED_STATUSES.has(ctx.appointmentStatus)) return false;
  return ctx.actorUserId === ctx.patientUserId || ctx.actorUserId === ctx.doctorUserId;
}

export type VideoSessionStateName =
  | "SCHEDULED"
  | "WAITING"
  | "IN_CALL"
  | "ENDED"
  | "CANCELLED";

const ALLOWED_TRANSITIONS: Record<VideoSessionStateName, VideoSessionStateName[]> = {
  SCHEDULED: ["WAITING", "IN_CALL", "CANCELLED"],
  WAITING: ["IN_CALL", "ENDED", "CANCELLED"],
  IN_CALL: ["ENDED", "CANCELLED"],
  ENDED: [],
  CANCELLED: [],
};

export function canTransitionVideoSession(
  from: VideoSessionStateName,
  to: VideoSessionStateName,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** JWT TTL: min(2h, seconds until appointmentEnd + 30m grace), at least 60s when still active. */
export function computeJoinTokenTtlSeconds(appointmentEndAt: Date, now = new Date()): number {
  const graceMs = 30 * 60 * 1000;
  const until = appointmentEndAt.getTime() + graceMs - now.getTime();
  const max = 2 * 60 * 60;
  const seconds = Math.floor(until / 1000);
  if (seconds < 60) return 60;
  return Math.min(seconds, max);
}

export function isStubTelemedicineUrl(url: string): boolean {
  return url.includes("stub-telemedicine.local") || url.startsWith("stub:");
}

export type VideoCallEventKind =
  | "JOIN"
  | "LEAVE"
  | "DENY"
  | "RECONNECT"
  | "RECORDING_START"
  | "RECORDING_STOP"
  | "CHAT_META"
  | "CHAT_MESSAGE"
  | "WAITING"
  | "IN_CALL";

export const VISIT_CHAT_MAX_LENGTH = 1000;

export type VisitChatRole = "patient" | "doctor";

export type VisitChatMetadata = {
  type: "message";
  body: string;
  senderName: string;
  role: VisitChatRole;
};

export function normalizeVisitChatBody(raw: string): string | null {
  const body = raw.replace(/\s+/g, " ").trim();
  if (!body) return null;
  return body.slice(0, VISIT_CHAT_MAX_LENGTH);
}

export function parseVisitChatMetadata(metadata: unknown): VisitChatMetadata | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = metadata as Record<string, unknown>;
  if (value.type !== "message") return null;
  if (typeof value.body !== "string") return null;
  if (value.role !== "patient" && value.role !== "doctor") return null;
  const body = normalizeVisitChatBody(value.body);
  if (!body) return null;
  const senderName =
    typeof value.senderName === "string" && value.senderName.trim()
      ? value.senderName.trim().slice(0, 120)
      : value.role === "doctor"
        ? "Doctor"
        : "Patient";
  return { type: "message", body, senderName, role: value.role };
}
