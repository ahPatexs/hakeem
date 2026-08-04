"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { requireRole } from "@/auth/guards";
import { isAuthDomainError } from "@/auth/errors";
import {
  createConsultationSession,
  endConsultationSession,
  getJoinCredentials,
  getSessionAnalytics,
  leaveConsultationSession,
  listVideoCallEvents,
  recordVideoReconnect,
  startVideoRecording,
} from "@/lib/platform/video";

const appointmentSchema = z.object({
  appointmentId: z.string().min(1),
});

const analyticsSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export async function platformCreateVideoSession(input: unknown) {
  try {
    const parsed = appointmentSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
    const session = await auth();
    if (!session?.user?.id) return { ok: false as const, code: "UNAUTHORIZED" };
    return createConsultationSession({
      appointmentId: parsed.data.appointmentId,
      actorUserId: session.user.id,
    });
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false as const, code: error.code };
    return { ok: false as const, code: "INTERNAL_FAILURE" };
  }
}

export async function platformGetVideoJoinCredentials(input: unknown) {
  try {
    const parsed = appointmentSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
    const session = await auth();
    if (!session?.user?.id) return { ok: false as const, code: "UNAUTHORIZED" };
    return getJoinCredentials({
      appointmentId: parsed.data.appointmentId,
      actorUserId: session.user.id,
    });
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false as const, code: error.code };
    return { ok: false as const, code: "INTERNAL_FAILURE" };
  }
}

export async function platformEndVideoSession(input: unknown) {
  try {
    const parsed = appointmentSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
    const session = await auth();
    if (!session?.user?.id) return { ok: false as const, code: "UNAUTHORIZED" };
    return endConsultationSession({
      appointmentId: parsed.data.appointmentId,
      actorUserId: session.user.id,
    });
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false as const, code: error.code };
    return { ok: false as const, code: "INTERNAL_FAILURE" };
  }
}

export async function platformLeaveVideoSession(input: unknown) {
  try {
    const parsed = appointmentSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
    const session = await auth();
    if (!session?.user?.id) return { ok: false as const, code: "UNAUTHORIZED" };
    return leaveConsultationSession({
      appointmentId: parsed.data.appointmentId,
      actorUserId: session.user.id,
    });
  } catch {
    return { ok: false as const, code: "INTERNAL_FAILURE" };
  }
}

export async function platformRecordVideoReconnect(input: unknown) {
  try {
    const parsed = appointmentSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
    const session = await auth();
    if (!session?.user?.id) return { ok: false as const, code: "UNAUTHORIZED" };
    return recordVideoReconnect({
      appointmentId: parsed.data.appointmentId,
      actorUserId: session.user.id,
    });
  } catch {
    return { ok: false as const, code: "INTERNAL_FAILURE" };
  }
}

export async function platformStartVideoRecording(input: unknown) {
  try {
    const parsed = appointmentSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
    const session = await auth();
    if (!session?.user?.id) return { ok: false as const, code: "UNAUTHORIZED" };
    return startVideoRecording({
      appointmentId: parsed.data.appointmentId,
      actorUserId: session.user.id,
    });
  } catch {
    return { ok: false as const, code: "INTERNAL_FAILURE" };
  }
}

export async function platformListVideoCallEvents(input: unknown) {
  try {
    const parsed = appointmentSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
    const session = await auth();
    if (!session?.user?.id) return { ok: false as const, code: "UNAUTHORIZED" };
    const isAdmin = session.user.role === "ADMIN";
    return listVideoCallEvents({
      appointmentId: parsed.data.appointmentId,
      actorUserId: session.user.id,
      isAdmin,
    });
  } catch {
    return { ok: false as const, code: "INTERNAL_FAILURE" };
  }
}

export async function platformGetVideoSessionAnalytics(input: unknown) {
  try {
    await requireRole("ADMIN");
    const parsed = analyticsSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
    return getSessionAnalytics(parsed.data);
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false as const, code: error.code };
    return { ok: false as const, code: "INTERNAL_FAILURE" };
  }
}
