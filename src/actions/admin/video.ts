"use server";

import { z } from "zod";
import { withAdmin } from "./_helpers";
import { listAdminVideoBoard, listVideoCallEvents } from "@/lib/platform/video";

export async function listAdminVideoSessions() {
  return withAdmin(async () => {
    const result = await listAdminVideoBoard();
    if (!result.ok) return { live: [], recent: [] };
    return result.data;
  });
}

export async function getAdminVideoCallLog(input: unknown) {
  const parsed = z.object({ appointmentId: z.string().min(1) }).safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };
  return withAdmin(async (admin) => {
    const result = await listVideoCallEvents({
      appointmentId: parsed.data.appointmentId,
      actorUserId: admin.id,
      isAdmin: true,
    });
    if (!result.ok) return { events: [] as Array<{ id: string; kind: string; actorUserId: string | null; createdAt: string }> };
    return result.data;
  });
}
