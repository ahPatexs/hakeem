import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/platform/notifications";
import type { NotificationCategory } from "@prisma/client";

/** Notify all Active ADMIN users in-portal (batched via platform notify). */
export async function notifyAdmins(input: {
  category: "ADMIN_OPS" | "SECURITY" | "HEALTH" | "AI_GOVERNANCE" | "PAYMENT" | "SYSTEM";
  title: string;
  body: string;
  href?: string;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: "ACTIVE" },
    select: { id: true },
    take: 200,
  });
  if (!admins.length) return;

  const categoryMap: Record<string, NotificationCategory> = {
    ADMIN_OPS: "ADMIN_OPS",
    SECURITY: "SECURITY",
    HEALTH: "HEALTH",
    AI_GOVERNANCE: "AI_GOVERNANCE",
    PAYMENT: "PAYMENT",
    SYSTEM: "SYSTEM",
  };

  await Promise.allSettled(
    admins.map((admin) =>
      notify({
        recipientUserId: admin.id,
        eventType: "admin.ops",
        category: categoryMap[input.category] ?? "ADMIN_OPS",
        title: input.title,
        body: input.body,
        href: input.href,
      }),
    ),
  );
}
