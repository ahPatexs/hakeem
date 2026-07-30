import type { NotificationCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CreateNotificationInput {
  recipientUserId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      recipientUserId: input.recipientUserId,
      category: input.category,
      title: input.title,
      body: input.body,
      href: input.href ?? undefined,
    },
  });
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return [];
  return prisma.$transaction(
    inputs.map((input) =>
      prisma.notification.create({
        data: {
          recipientUserId: input.recipientUserId,
          category: input.category,
          title: input.title,
          body: input.body,
          href: input.href ?? undefined,
        },
      }),
    ),
  );
}
