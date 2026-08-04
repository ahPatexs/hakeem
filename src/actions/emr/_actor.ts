import { auth } from "@/auth";
import type { EmrActor } from "@/domain/emr/access";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";

/**
 * Build an EmrActor from the current session.
 * Doctor id is resolved from `User.doctorProfileId` (never client-supplied).
 */
export async function resolveEmrActor(): Promise<PlatformResult<EmrActor>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return platformFail("UNAUTHORIZED", "Authentication required");
  }

  const role = session.user.role;
  if (role !== "PATIENT" && role !== "DOCTOR" && role !== "ADMIN") {
    return platformFail("FORBIDDEN", "Unsupported role for EMR");
  }

  let doctorId: string | null = null;
  if (role === "DOCTOR") {
    const row = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { doctorProfileId: true },
    });
    doctorId = row?.doctorProfileId ?? null;
  }

  return platformOk({
    userId: session.user.id,
    role,
    doctorId,
  });
}

export type EmrActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string };

export function toActionResult<T>(result: PlatformResult<T>): EmrActionResult<T> {
  if (!result.ok) return { ok: false, code: result.code };
  return { ok: true, data: result.data };
}
