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
