import { setRequestLocale } from "next-intl/server";
import { RoleLayoutGate } from "@/auth/role-layout";
import { QueryProvider } from "@/components/providers/query-provider";
import { AdminPortalShell } from "@/components/admin/shell/admin-portal-shell";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function AdminShellGate({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const unreadCount = await prisma.notification.count({
    where: { recipientUserId: userId, readAt: null, dismissedAt: null },
  });

  return (
    <AdminPortalShell
      unreadCount={unreadCount}
      displayName={row?.name ?? row?.email ?? "Admin"}
      email={row?.email ?? ""}
    >
      {children}
    </AdminPortalShell>
  );
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <RoleLayoutGate role="ADMIN" locale={locale}>
      <QueryProvider>
        <AdminShellGate locale={locale}>{children}</AdminShellGate>
      </QueryProvider>
    </RoleLayoutGate>
  );
}
