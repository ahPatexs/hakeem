import { prisma } from "@/lib/prisma";
import { requireRole } from "@/auth/guards";

export class DoctorContextError extends Error {
  readonly code = "DOCTOR_PROFILE_UNLINKED";
  constructor() {
    super("Doctor account is not linked to a clinical profile");
    this.name = "DoctorContextError";
  }
}

export type DoctorContext = {
  userId: string;
  doctorId: string;
  email: string;
  displayName: string;
  timezone: string | null;
};

/**
 * Resolves the authenticated DOCTOR session into a clinical doctor context.
 * Requires `User.doctorProfileId` to be linked to a CMS `Doctor` row.
 * Never trust a client-supplied doctorId — always derive from the session.
 */
export async function requireDoctorContext(): Promise<DoctorContext> {
  const user = await requireRole("DOCTOR");

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      doctorProfileId: true,
      doctorProfileExtras: { select: { timezone: true } },
    },
  });

  if (!row?.doctorProfileId) {
    throw new DoctorContextError();
  }

  return {
    userId: user.id,
    doctorId: row.doctorProfileId,
    email: user.email,
    displayName: user.name ?? user.email,
    timezone: row.doctorProfileExtras?.timezone ?? null,
  };
}

export function isDoctorContextError(error: unknown): error is DoctorContextError {
  return error instanceof DoctorContextError;
}
