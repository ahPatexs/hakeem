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
  listVisitChatMessages,
  recordVideoReconnect,
  sendVisitChatMessage,
  startVideoRecording,
} from "@/lib/platform/video";

const appointmentSchema = z.object({
  appointmentId: z.string().min(1),
});

const visitChatSendSchema = z.object({
  appointmentId: z.string().min(1),
  body: z.string().min(1).max(2000),
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

/** Patient self-acknowledge of current TELEHEALTH consent text (required before join). */
export async function platformAcknowledgeTelehealthConsent() {
  try {
    const session = await auth();
    if (!session?.user?.id) return { ok: false as const, code: "UNAUTHORIZED" as const };
    if (session.user.role !== "PATIENT" && session.user.role !== "ADMIN") {
      // Doctors joining as host do not need patient telehealth self-ack here
      return { ok: true as const, data: { already: true } };
    }

    const { listConsentState, acknowledgeConsent } = await import("@/lib/emr/consents");
    const actor = {
      userId: session.user.id,
      role: "PATIENT" as const,
    };
    const listed = await listConsentState(actor, session.user.id);
    if (!listed.ok) return { ok: false as const, code: listed.code, message: listed.message };
    const tele = listed.data.items.find((i) => i.typeCode === "TELEHEALTH");
    if (!tele) return { ok: false as const, code: "NOT_FOUND" as const, message: "TELEHEALTH consent type missing" };
    if (tele.state === "ACKNOWLEDGED") return { ok: true as const, data: { already: true } };
    if (!tele.currentTextVersionId) {
      return { ok: false as const, code: "NOT_FOUND" as const, message: "No telehealth consent text published" };
    }
    const ack = await acknowledgeConsent(actor, {
      patientUserId: session.user.id,
      typeCode: "TELEHEALTH",
      textVersionId: tele.currentTextVersionId,
    });
    if (!ack.ok) return { ok: false as const, code: ack.code, message: ack.message };
    return { ok: true as const, data: { already: false, eventId: ack.data.eventId } };
  } catch (error) {
    if (isAuthDomainError(error)) return { ok: false as const, code: error.code };
    return { ok: false as const, code: "INTERNAL_FAILURE" as const };
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

export async function platformListVisitChat(input: unknown) {
  try {
    const parsed = appointmentSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
    const session = await auth();
    if (!session?.user?.id) return { ok: false as const, code: "UNAUTHORIZED" };
    return listVisitChatMessages({
      appointmentId: parsed.data.appointmentId,
      actorUserId: session.user.id,
    });
  } catch {
    return { ok: false as const, code: "INTERNAL_FAILURE" };
  }
}

export async function platformSendVisitChat(input: unknown) {
  try {
    const parsed = visitChatSendSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
    const session = await auth();
    if (!session?.user?.id) return { ok: false as const, code: "UNAUTHORIZED" };
    return sendVisitChatMessage({
      appointmentId: parsed.data.appointmentId,
      actorUserId: session.user.id,
      body: parsed.data.body,
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
