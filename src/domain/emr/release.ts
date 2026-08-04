export type LabReleaseStatus = "PENDING_REVIEW" | "RELEASED" | "RETRACTED" | "SUPERSEDED";

/** Patients see only diagnostics released to them (FR-013). */
export function canPatientSeeLab(releaseStatus: LabReleaseStatus): boolean {
  return releaseStatus === "RELEASED";
}

/**
 * Doctors with care relationship see Preliminary and Final results under review
 * or released; retracted/superseded are not current.
 */
export function canDoctorSeeLab(releaseStatus: LabReleaseStatus): boolean {
  return releaseStatus === "PENDING_REVIEW" || releaseStatus === "RELEASED";
}
