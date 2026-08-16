import { setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/routing";
import { RoleLayoutGate } from "@/auth/role-layout";
import { QueryProvider } from "@/components/providers/query-provider";
import { PortalShell } from "@/components/patient/shell/portal-shell";
import { DoctorShell } from "@/components/doctor/shell/doctor-shell";
import { AdminPortalShell } from "@/components/admin/shell/admin-portal-shell";
import { prisma } from "@/lib/prisma";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user?.id) {
    redirect({ href: "/unauthorized", locale });
    return null;
  }

  const userId = session.user.id;
  const role = session.user.role;

  if (role === "PATIENT") {
    const [row, unreadCount] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, image: true } }),
      prisma.notification.count({ where: { recipientUserId: userId, readAt: null, dismissedAt: null } }),
    ]);
    return (
      <RoleLayoutGate role="PATIENT" locale={locale}>
        <QueryProvider>
          <PortalShell unreadCount={unreadCount} displayName={row?.name ?? row?.email ?? ""} photoUrl={row?.image}>
            {children}
          </PortalShell>
        </QueryProvider>
      </RoleLayoutGate>
    );
  }

  if (role === "DOCTOR") {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, doctorProfileId: true },
    });
    const unreadCount = await prisma.notification.count({
      where: { recipientUserId: userId, readAt: null, dismissedAt: null },
    });
    const cmsDoctor = row?.doctorProfileId
      ? await prisma.doctor.findUnique({
          where: { id: row.doctorProfileId },
          select: {
            nameEn: true,
            nameAr: true,
            photoUrl: true,
            specialty: { select: { nameEn: true, nameAr: true } },
          },
        })
      : null;
    const isAr = locale === "ar";
    const displayName = cmsDoctor ? (isAr ? cmsDoctor.nameAr : cmsDoctor.nameEn) : (row?.name ?? row?.email ?? "");
    const specialty = cmsDoctor ? (isAr ? cmsDoctor.specialty.nameAr : cmsDoctor.specialty.nameEn) : null;
    return (
      <RoleLayoutGate role="DOCTOR" locale={locale}>
        <QueryProvider>
          <DoctorShell unreadCount={unreadCount} displayName={displayName} specialty={specialty} photoUrl={cmsDoctor?.photoUrl}>
            {children}
          </DoctorShell>
        </QueryProvider>
      </RoleLayoutGate>
    );
  }

  const row = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const unreadCount = await prisma.notification.count({
    where: { recipientUserId: userId, readAt: null, dismissedAt: null },
  });
  return (
    <RoleLayoutGate role="ADMIN" locale={locale}>
      <QueryProvider>
        <AdminPortalShell unreadCount={unreadCount} displayName={row?.name ?? row?.email ?? ""} email={row?.email ?? ""}>
          {children}
        </AdminPortalShell>
      </QueryProvider>
    </RoleLayoutGate>
  );
}
