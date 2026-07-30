export type LabReleaseStatus = "PENDING_REVIEW" | "RELEASED" | "RETRACTED" | "SUPERSEDED";

export interface LabVisibility {
  releaseStatus: LabReleaseStatus;
}

export function isVisibleToPatient(lab: LabVisibility): boolean {
  return lab.releaseStatus === "RELEASED";
}

export function filterVisibleLabs<T extends LabVisibility>(labs: T[]): T[] {
  return labs.filter(isVisibleToPatient);
}
