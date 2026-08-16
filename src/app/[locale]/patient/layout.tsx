import { setRequestLocale } from "next-intl/server";
import { PortalShell } from "@/components/patient/shell/portal-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { RoleLayoutGate } from "@/auth/role-layout";
import { MaintenanceGate } from "@/components/admin/maintenance-gate";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function PatientShellGate({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session!.user.id;
  const [row, unreadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true },
    }),
    prisma.notification.count({
      where: { recipientUserId: userId, readAt: null, dismissedAt: null },
    }),
  ]);

  return (
    <PortalShell
      unreadCount={unreadCount}
      displayName={row?.name ?? row?.email ?? "Patient"}
      photoUrl={row?.image}
    >
      <MaintenanceGate>{children}</MaintenanceGate>
    </PortalShell>
  );
}

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <RoleLayoutGate role="PATIENT" locale={locale}>
      <QueryProvider>
        <PatientShellGate>{children}</PatientShellGate>
      </QueryProvider>
    </RoleLayoutGate>
  );
}