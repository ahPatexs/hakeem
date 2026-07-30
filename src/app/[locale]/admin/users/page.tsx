import { setRequestLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { AdminDoctorsPanel } from "@/components/auth/admin-panels";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      doctorApproval: true,
      lockedUntil: true,
    },
  });
  const doctors = users.filter((u) => u.role === "DOCTOR");
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-margin-mobile py-28 md:px-margin-desktop">
      <h1 className="font-headline text-3xl text-primary">{t("manageUsers")}</h1>
      <AdminDoctorsPanel doctors={doctors} users={users} />
    </div>
  );
}
