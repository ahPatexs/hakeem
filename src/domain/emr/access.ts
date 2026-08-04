import { hasCareRelationship } from "@/domain/doctor/care-relationship";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";

export type EmrAccessAction =
  | "read"
  | "write_clinical"
  | "write_self"
  | "sign"
  | "admin_oversight"
  | "download";

export type EmrActor = {
  userId: string;
  role: "PATIENT" | "DOCTOR" | "ADMIN";
  doctorId?: string | null;
};

const PATIENT_ALLOWED: ReadonlySet<EmrAccessAction> = new Set([
  "read",
  "write_self",
  "download",
]);

const DOCTOR_ALLOWED: ReadonlySet<EmrAccessAction> = new Set([
  "read",
  "write_clinical",
  "sign",
  "download",
]);

const ADMIN_ALLOWED: ReadonlySet<EmrAccessAction> = new Set([
  "read",
  "admin_oversight",
  "download",
]);

/**
 * Enforce EMR RBAC for a patient-scoped chart action (FR-036).
 * Doctor denials without a care relationship return NOT_FOUND (anti-enumeration).
 */
export async function assertEmrAccess(
  actor: EmrActor,
  patientUserId: string,
  action: EmrAccessAction,
): Promise<PlatformResult<{ allowed: true }>> {
  switch (actor.role) {
    case "PATIENT": {
      if (actor.userId !== patientUserId) {
        return platformFail("FORBIDDEN", "Patient may only access own chart");
      }
      if (!PATIENT_ALLOWED.has(action)) {
        return platformFail("FORBIDDEN", `Patient cannot perform ${action}`);
      }
      return platformOk({ allowed: true });
    }

    case "DOCTOR": {
      if (action === "admin_oversight" || action === "write_self") {
        return platformFail("FORBIDDEN", `Doctor cannot perform ${action}`);
      }
      if (!DOCTOR_ALLOWED.has(action)) {
        return platformFail("FORBIDDEN", `Doctor cannot perform ${action}`);
      }
      if (!actor.doctorId) {
        return platformFail("NOT_FOUND", "Chart not found");
      }
      const related = await hasCareRelationship(actor.doctorId, patientUserId);
      if (!related) {
        return platformFail("NOT_FOUND", "Chart not found");
      }
      return platformOk({ allowed: true });
    }

    case "ADMIN": {
      if (!ADMIN_ALLOWED.has(action)) {
        return platformFail("FORBIDDEN", `Admin cannot perform ${action}`);
      }
      return platformOk({ allowed: true });
    }

    default: {
      return platformFail("FORBIDDEN", "Unknown role");
    }
  }
}
