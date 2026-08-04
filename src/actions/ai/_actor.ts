import { auth } from "@/auth";
import type { AiActorRole } from "@/domain/ai/access";
import { platformFail, platformOk, type PlatformResult } from "@/domain/platform/outcomes";
import { prisma } from "@/lib/prisma";

export type AiActor = {
  userId: string;
  role: AiActorRole;
  doctorId?: string | null;
};

/**
 * Build an AiActor from the current session.
 * Doctor id is resolved from `User.doctorProfileId` (never client-supplied).
 */
export async function resolveAiActor(): Promise<PlatformResult<AiActor>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    return platformFail("UNAUTHORIZED", "Authentication required");
  }

  const role = session.user.role;
  if (role !== "PATIENT" && role !== "DOCTOR" && role !== "ADMIN") {
    return platformFail("FORBIDDEN", "Unsupported role for AI");
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

export type AiActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string };

export function toActionResult<T>(result: PlatformResult<T>): AiActionResult<T> {
  if (!result.ok) return { ok: false, code: result.code };
  return { ok: true, data: result.data };
}
