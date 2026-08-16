import { setRequestLocale, getTranslations } from "next-intl/server";
import { ListChecks } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDoctorDashboard } from "@/actions/doctor/dashboard";
import { DashboardWidgets } from "@/components/doctor/dashboard/widgets";
import { ErrorState } from "@/components/doctor/shared";
import { GlanceStat, WelcomeBanner } from "@/components/portal/welcome-banner";
import { Link } from "@/i18n/routing";
import { localizedText } from "@/lib/utils";

export default async function DoctorDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("doctor.dashboard");

  const result = await getDoctorDashboard();
  if (!result.ok) {
    return <ErrorState title={t("loadErrorTitle")} message={t("loadError")} />;
  }

  const session = await auth();
  const userId = session?.user?.id;
  const row = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          doctorProfileId: true,
        },
      })
    : null;
  const cmsDoctor = row?.doctorProfileId
    ? await prisma.doctor.findUnique({
        where: { id: row.doctorProfileId },
        select: { nameEn: true, nameAr: true },
      })
    : null;
  const name = cmsDoctor
    ? localizedText(locale, cmsDoctor.nameEn, cmsDoctor.nameAr)
    : (row?.name ?? row?.email ?? session?.user?.name ?? session?.user?.email ?? "");
  const stats = result.data.stats;

  return (
    <div className="space-y-8">
      <WelcomeBanner
        title={t("welcome", { name })}
        subtitle={t("subtitle")}
        action={
          <Link
            href="/doctor/queue"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm hover:bg-white/90"
          >
            <ListChecks className="h-4 w-4" aria-hidden />
            {t("queueCta")}
          </Link>
        }
        aside={
          stats.ok ? (
            <>
              <GlanceStat label={t("stats.today")} value={stats.data.todayTotal} />
              <GlanceStat label={t("stats.inQueue")} value={stats.data.inQueue} />
              <GlanceStat
                label={t("stats.rating")}
                value={stats.data.ratingCount > 0 ? stats.data.ratingAvg.toFixed(1) : "—"}
              />
            </>
          ) : undefined
        }
      />
      <DashboardWidgets bundle={result.data} />
    </div>
  );
}
