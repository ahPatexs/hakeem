import type { NotificationCategory } from "@prisma/client";
import { notify } from "@/lib/platform/notifications";

export interface CreateNotificationInput {
  recipientUserId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href?: string | null;
  eventType?: string;
}

function defaultEventType(category: NotificationCategory): string {
  switch (category) {
    case "APPOINTMENT":
    case "QUEUE":
      return "appointment.confirmed";
    case "PAYMENT":
      return "payment.received";
    case "SECURITY":
      return "security.alert";
    case "ADMIN_OPS":
      return "admin.ops";
    default:
      return "appointment.confirmed";
  }
}

export async function createNotification(input: CreateNotificationInput) {
  const result = await notify({
    recipientUserId: input.recipientUserId,
    eventType: input.eventType ?? defaultEventType(input.category),
    category: input.category,
    title: input.title,
    body: input.body,
    href: input.href ?? undefined,
  });
  if (!result.ok) {
    throw new Error(result.code);
  }
  return { id: result.data.notificationId };
}

export async function createNotifications(inputs: CreateNotificationInput[]) {
  if (inputs.length === 0) return [];
  return Promise.all(inputs.map((input) => createNotification(input)));
}
