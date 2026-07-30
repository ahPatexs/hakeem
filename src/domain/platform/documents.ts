export type ScanStatus = "PENDING" | "CLEAN" | "REJECTED";

export type DocumentAccessRole = "PATIENT" | "DOCTOR" | "ADMIN";

/** Medical uploads are unavailable until scan is CLEAN (fail-closed). */
export function isDocumentAvailable(scanStatus: ScanStatus): boolean {
  return scanStatus === "CLEAN";
}

/** Signed clinical artifacts must not be silently overwritten (FR-015). */
export function isSignedClinicalImmutable(signedAt: Date | null | undefined): boolean {
  return Boolean(signedAt);
}

/**
 * Role-based document ACL. Callers must supply `hasCareRelationship` for DOCTOR viewers.
 * Defaults scan to CLEAN when omitted (e.g. signed clinical documents without scan rows).
 */
export function canAccessDocument(
  actorUserId: string,
  patientUserId: string,
  role: DocumentAccessRole,
  options?: {
    scanStatus?: ScanStatus;
    hasCareRelationship?: boolean;
  },
): boolean {
  const scanStatus = options?.scanStatus ?? "CLEAN";
  if (!isDocumentAvailable(scanStatus)) return false;
  if (role === "ADMIN") return true;
  if (role === "PATIENT") return actorUserId === patientUserId;
  if (role === "DOCTOR") return Boolean(options?.hasCareRelationship);
  return false;
}
