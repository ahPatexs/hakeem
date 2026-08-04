"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  withAdminPermission,
  type AdminActionResult,
  type AdminMutationResult,
} from "@/actions/admin/_helpers";
import { PAGE_SIZE } from "@/domain/admin/constants";

export async function listAdminNotifications(input: unknown): Promise<
  AdminActionResult<{
    items: Array<{
      id: string;
      category: string;
      title: string;
      body: string;
      href: string | null;
      readAt: Date | null;
      createdAt: Date;
    }>;
    total: number;
    unread: number;
    page: number;
    pageSize: number;
  }>
> {
  return withAdminPermission("admin:portal:access", async (admin) => {
    const parsed = z.object({ page: z.coerce.number().int().min(1).default(1) }).safeParse(input ?? {});
    if (!parsed.success) throw new Error("VALIDATION_ERROR");
    const where = { recipientUserId: admin.id };
    const [items, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (parsed.data.page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { ...where, readAt: null, dismissedAt: null } }),
    ]);
    return { items, total, unread, page: parsed.data.page, pageSize: PAGE_SIZE };
  });
}

export async function markNotificationRead(input: unknown): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:portal:access");
    const parsed = z.object({ id: z.string().min(1) }).safeParse(input);
    if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR" };
    await prisma.notification.updateMany({
      where: { id: parsed.data.id, recipientUserId: admin.id },
      data: { readAt: new Date() },
    });
    revalidatePath("/admin/notifications");
    return { ok: true };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}

export async function markAllNotificationsRead(): Promise<AdminMutationResult> {
  try {
    const admin = await (await import("@/actions/admin/_helpers")).requireAdminPermission("admin:portal:access");
    await prisma.notification.updateMany({
      where: { recipientUserId: admin.id, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/admin/notifications");
    return { ok: true };
  } catch (error) {
    const { isAuthDomainError } = await import("@/auth/errors");
    if (isAuthDomainError(error)) return { ok: false, code: error.code };
    return { ok: false, code: "UNKNOWN" };
  }
}
