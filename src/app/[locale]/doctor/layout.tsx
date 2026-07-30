import { setRequestLocale, getTranslations } from "next-intl/server";
import { RoleLayoutGate } from "@/auth/role-layout";
import { QueryProvider } from "@/components/providers/query-provider";
import { DoctorShell } from "@/components/doctor/shell/doctor-shell";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

async function DoctorShellGate({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("doctor.shell");
  const session = await auth();
  const userId = session!.user.id;

  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      doctorProfileId: true,
    },
  });

  if (!row?.doctorProfileId) {
    // Doctor account exists but is not linked to a clinical profile yet.
    return (
      <div className="mx-auto max-w-xl px-6 py-28 text-center">
        <h1 className="font-headline text-2xl text-primary">{t("unlinkedTitle")}</h1>
        <p className="mt-3 text-on-surface-variant">{t("unlinkedBody")}</p>
      </div>
    );
  }

  const [unreadCount, cmsDoctor] = await Promise.all([
    prisma.notification.count({
      where: { recipientUserId: userId, readAt: null, dismissedAt: null },
    }),
    prisma.doctor.findUnique({
      where: { id: row.doctorProfileId },
      select: {
        nameEn: true,
        nameAr: true,
        specialty: { select: { nameEn: true, nameAr: true } },
      },
    }),
  ]);

  const isAr = locale === "ar";
  const displayName = cmsDoctor ? (isAr ? cmsDoctor.nameAr : cmsDoctor.nameEn) : (row.name ?? row.email);
  const specialty = cmsDoctor ? (isAr ? cmsDoctor.specialty.nameAr : cmsDoctor.specialty.nameEn) : null;

  return (
    <DoctorShell unreadCount={unreadCount} displayName={displayName} specialty={specialty}>
      {children}
    </DoctorShell>
  );
}

export default async function DoctorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <RoleLayoutGate role="DOCTOR" locale={locale}>
      <QueryProvider>
        <DoctorShellGate locale={locale}>{children}</DoctorShellGate>
      </QueryProvider>
    </RoleLayoutGate>
  );
}
