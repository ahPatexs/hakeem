import type { AppointmentStatus } from "@prisma/client";
import { DomainRuleError } from "./errors";

/** Statuses from which a doctor may start a consultation. */
const STARTABLE: readonly AppointmentStatus[] = ["CONFIRMED", "CHECKED_IN"];

/** Statuses from which a doctor may mark no-show. */
const NO_SHOWABLE: readonly AppointmentStatus[] = ["CONFIRMED", "CHECKED_IN"];

export function assertCanStart(status: AppointmentStatus): void {
  if (!STARTABLE.includes(status)) {
    throw new DomainRuleError("INVALID_STATUS", `Cannot start consultation from ${status}`);
  }
}

export function assertCanComplete(status: AppointmentStatus): void {
  if (status !== "IN_PROGRESS") {
    throw new DomainRuleError("INVALID_STATUS", `Cannot complete consultation from ${status}`);
  }
}

export function assertCanMarkNoShow(status: AppointmentStatus): void {
  if (!NO_SHOWABLE.includes(status)) {
    throw new DomainRuleError("INVALID_STATUS", `Cannot mark no-show from ${status}`);
  }
}

/** Visit states that block clinical mutations (prescribe/document as-if-active). */
export function isTerminalForClinicalWork(status: AppointmentStatus): boolean {
  return status === "CANCELLED" || status === "NO_SHOW" || status === "RESCHEDULED";
}

/** Workspace is readable for the assigned doctor in these states. */
export function isWorkspaceReadable(status: AppointmentStatus): boolean {
  return status === "IN_PROGRESS" || status === "COMPLETED" || status === "CHECKED_IN" || status === "CONFIRMED";
}
