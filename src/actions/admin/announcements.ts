"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AnnouncementSegment } from "@prisma/client";
import {
  requestMeta,
  type AdminMutationResult,
} from "@/actions/admin/_helpers";
import { REASON_MIN } from "@/domain/admin/constants";
import { adminAudit, ADMIN_AUDIT_TYPES } from "@/lib/admin/audit";
import { validateReason } from "@/domain/admin/user-lifecycle";

export async function publishAnnouncement(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:notifications:write");
    const parsed = z
      .object({
        title: z.string().min(3).max(120),
        body: z.string().min(REASON_MIN).max(2000),
        segment: z.nativeEnum(AnnouncementSegment),
      })
      .safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    validateReason(parsed.data.body, REASON_MIN);

    const announcement = await prisma.platformAnnouncement.create({
      data: {
        title: parsed.data.title,
        body: parsed.data.body,
        segment: parsed.data.segment,
        publishedByUserId: admin.id,
      },
    });

    const roleFilter =
      parsed.data.segment === "ALL"
        ? undefined
        : parsed.data.segment === "PATIENT"
          ? "PATIENT"
          : "DOCTOR";
    const recipients = await prisma.user.findMany({
      where: { status: "ACTIVE", ...(roleFilter ? { role: roleFilter } : {}) },
      select: { id: true },
      take: 500,
    });
    if (recipients.length) {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({
          recipientUserId: r.id,
          category: "ADMIN_OPS" as const,
          title: parsed.data.title,
          body: parsed.data.body,
          href: "/patient/notifications",
        })),
      });
    }

    await adminAudit({
      type: ADMIN_AUDIT_TYPES.announcementPublish,
      outcome: "SUCCESS",
      actorUserId: admin.id,
      meta: { announcementId: announcement.id, segment: parsed.data.segment },
      ...(await requestMeta()),
    });
    revalidatePath("/admin/notifications");
    return { ok: true, message: "Announcement published." };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    const { isAdminDomainError } = await import("@/domain/admin/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    if (isAdminDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}
