export type EmrTimelineEventType =
  | "ENCOUNTER"
  | "APPOINTMENT"
  | "PRESCRIPTION"
  | "LAB"
  | "IMAGING"
  | "DOCUMENT"
  | "CONSENT"
  | "DIAGNOSIS"
  | "PLAN"
  | "NOTE"
  | "SYSTEM";

export type EmrTimelineVisibility = "PATIENT" | "CLINICIAN" | "ADMIN" | "ALL_AUTHORIZED";

export type EmrTimelineEventStatus = "ACTIVE" | "SUPERSEDED" | "HIDDEN";

export type EmrTimelineEvent = {
  id: string;
  patientUserId: string;
  type: EmrTimelineEventType;
  effectiveAt: Date | string;
  visibility: EmrTimelineVisibility;
  status?: EmrTimelineEventStatus;
  title?: string;
  summary?: string;
  actorUserId?: string | null;
  refType?: string | null;
  refId?: string | null;
};

export type EmrTimelineRole = "PATIENT" | "DOCTOR" | "ADMIN";

/** Newest-first chronological order (FR-043). */
export function sortTimelineEvents<T extends { effectiveAt: Date | string }>(events: T[]): T[] {
  return [...events].sort((a, b) => {
    const aMs = typeof a.effectiveAt === "string" ? Date.parse(a.effectiveAt) : a.effectiveAt.getTime();
    const bMs = typeof b.effectiveAt === "string" ? Date.parse(b.effectiveAt) : b.effectiveAt.getTime();
    return bMs - aMs;
  });
}

/** Whether an authorized viewer role may see an event at the given visibility. */
export function visibilityForRole(
  role: EmrTimelineRole,
  visibility: EmrTimelineVisibility,
): boolean {
  switch (visibility) {
    case "ALL_AUTHORIZED":
      return true;
    case "PATIENT":
      // Patient-facing events remain visible to authorized clinicians/admin.
      return role === "PATIENT" || role === "DOCTOR" || role === "ADMIN";
    case "CLINICIAN":
      return role === "DOCTOR" || role === "ADMIN";
    case "ADMIN":
      return role === "ADMIN";
    default:
      return false;
  }
}
