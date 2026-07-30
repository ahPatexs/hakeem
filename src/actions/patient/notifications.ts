"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { withPatient, withPatientMutation } from "@/actions/patient/_helpers";

const PAGE_SIZE = 30;
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1) });
const idSchema = z.object({ id: z.string().min(1) });

export async function listNotifications(input?: unknown) {
  const parsed = listSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatient(async (userId) => {
    const where = { recipientUserId: userId, dismissedAt: null };
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { recipientUserId: userId, readAt: null, dismissedAt: null },
      }),
    ]);
    return { items, total, unreadCount, page: parsed.data.page, pageSize: PAGE_SIZE };
  });
}

export async function markNotificationRead(input: unknown) {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatientMutation(async (userId) => {
    await prisma.notification.updateMany({
      where: { id: parsed.data.id, recipientUserId: userId },
      data: { readAt: new Date() },
    });
  });
}

export async function markAllNotificationsRead() {
  return withPatientMutation(async (userId) => {
    await prisma.notification.updateMany({
      where: { recipientUserId: userId, readAt: null, dismissedAt: null },
      data: { readAt: new Date() },
    });
  });
}

export async function dismissNotification(input: unknown) {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "VALIDATION_ERROR" };

  return withPatientMutation(async (userId) => {
    await prisma.notification.updateMany({
      where: { id: parsed.data.id, recipientUserId: userId },
      data: { dismissedAt: new Date(), readAt: new Date() },
    });
  });
}
