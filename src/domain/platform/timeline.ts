export type TimelineVisibility = "PATIENT" | "DOCTOR" | "BOTH";

export type TimelineEvent = {
  patientUserId: string;
  assignedDoctorUserId?: string | null;
  visibility: TimelineVisibility;
};

export function canViewTimelineEvent(
  viewerUserId: string,
  viewerRole: "PATIENT" | "DOCTOR",
  event: TimelineEvent,
): boolean {
  const isPatient = viewerUserId === event.patientUserId;
  const isAssignedDoctor =
    viewerRole === "DOCTOR" && viewerUserId === event.assignedDoctorUserId;

  switch (event.visibility) {
    case "PATIENT":
      return isPatient;
    case "DOCTOR":
      return isAssignedDoctor;
    case "BOTH":
      return isPatient || isAssignedDoctor;
    default:
      return false;
  }
}
