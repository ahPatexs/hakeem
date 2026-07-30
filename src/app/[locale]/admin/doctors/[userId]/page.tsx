import { setRequestLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/admin/shared/status-badge";

export default async function AdminDoctorDetailPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale, userId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("admin.doctors");
  const user = await prisma.user.findUnique({
    where: { id: userId, role: "DOCTOR" },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      doctorApproval: true,
      doctorRejectionReason: true,
    },
  });
  if (!user) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-headline text-2xl text-primary">{user.name ?? user.email}</h1>
      <p className="text-on-surface-variant">{user.email}</p>
      <StatusBadge label={user.doctorApproval ?? "—"} />
      {user.doctorRejectionReason ? (
        <p className="text-sm text-on-surface-variant">
          {t("rejectionReason")}: {user.doctorRejectionReason}
        </p>
      ) : null}
    </div>
  );
}
