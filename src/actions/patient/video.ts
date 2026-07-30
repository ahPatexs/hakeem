"use server";

import { z } from "zod";
import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import { canJoinVideo } from "@/domain/patient/video";
import { prisma } from "@/lib/prisma";

const joinSchema = z.object({ appointmentId: z.string().min(1) });

export type JoinPatientVideoResult =
  | { ok: true; url: string; expiresAt: string }
  | { ok: false; code: string };

export async function joinPatientVideo(input: unknown): Promise<JoinPatientVideoResult> {
  try {
    const parsed = joinSchema.safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };

    const user = await requireRole("PATIENT");
    const appointment = await prisma.appointment.findFirst({
      where: { id: parsed.data.appointmentId, patientUserId: user.id },
      select: {
        id: true,
        mode: true,
        status: true,
        startAt: true,
        endAt: true,
        videoRoomId: true,
      },
    });
    if (!appointment) return { ok: false, code: "NOT_FOUND" };
    if (!canJoinVideo(appointment)) return { ok: false, code: "JOIN_WINDOW_CLOSED" };

    const { getJoinCredentials } = await import("@/lib/platform/video");
    const creds = await getJoinCredentials({
      appointmentId: appointment.id,
      actorUserId: user.id,
    });
    if (!creds.ok) return { ok: false, code: creds.code };

    return { ok: true, url: creds.data.url, expiresAt: creds.data.expiresAt };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}
