import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { AdminDoctorsPanel } from "@/components/auth/admin-panels";
import { Link } from "@/i18n/routing";

export default async function AdminHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const [users, doctors] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        doctorApproval: true,
        lockedUntil: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "DOCTOR" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        doctorApproval: true,
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-margin-mobile py-28 md:px-margin-desktop">
      <div>
        <h1 className="font-headline text-3xl text-primary">{t("adminHomeTitle")}</h1>
        <p className="text-on-surface-variant">{t("adminHomeSubtitle")}</p>
        <Link href="/admin/users" className="mt-2 inline-block text-sm font-semibold text-med-green">
          {t("manageUsers")}
        </Link>
      </div>
      <AdminDoctorsPanel doctors={doctors} users={users} />
    </div>
  );
}
