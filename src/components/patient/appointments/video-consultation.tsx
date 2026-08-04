"use client";

import { VideoSessionShell } from "@/components/platform/video";
import type { Appointment } from "@prisma/client";

export function VideoConsultation({
  appointment,
}: {
  appointment: Pick<Appointment, "id" | "mode" | "status" | "startAt" | "endAt" | "videoRoomId">;
}) {
  return <VideoSessionShell appointmentId={appointment.id} role="patient" />;
}
