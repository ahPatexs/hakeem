export type PrescriptionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";

export interface PrescriptionTiming {
  status: PrescriptionStatus;
  endsAt: Date | null;
}

export function isActivePrescription(rx: PrescriptionTiming, now: Date = new Date()): boolean {
  if (rx.status !== "ACTIVE") return false;
  if (!rx.endsAt) return true;
  return rx.endsAt.getTime() > now.getTime();
}
