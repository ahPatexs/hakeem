"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { withDoctor, withDoctorMutation } from "./_helpers";
import { notificationIdSchema } from "@/lib/doctor/schemas";
import { DomainRuleError } from "@/domain/doctor/errors";

const PAGE_SIZE = 20;

export async function listDoctorNotifications(raw?: { page?: number; unreadOnly?: boolean }) {
  const page = Math.max(1, raw?.page ?? 1);
  return withDoctor(async (ctx) => {
    const where = {
      recipientUserId: ctx.userId,
      dismissedAt: null,
      ...(raw?.unreadOnly ? { readAt: null } : {}),
    };
    const [total, unreadCount, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { recipientUserId: ctx.userId, readAt: null, dismissedAt: null } }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);
    return { items, total, unreadCount, pageCount: Math.ceil(total / PAGE_SIZE) };
  });
}

export async function markNotificationRead(raw: { notificationId: string }) {
  const input = notificationIdSchema.parse(raw);
  return withDoctorMutation(async (ctx) => {
    const updated = await prisma.notification.updateMany({
      where: { id: input.notificationId, recipientUserId: ctx.userId, readAt: null },
      data: { readAt: new Date() },
    });
    if (updated.count === 0) throw new DomainRuleError("NOT_FOUND");
    revalidatePath("/[locale]/doctor", "layout");
  });
}

export async function markAllNotificationsRead() {
  return withDoctorMutation(async (ctx) => {
    await prisma.notification.updateMany({
      where: { recipientUserId: ctx.userId, readAt: null, dismissedAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/[locale]/doctor", "layout");
  });
}
