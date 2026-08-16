import { getTranslations } from "next-intl/server";
import { CalendarPlus } from "lucide-react";
import { auth } from "@/auth";
import { Link } from "@/i18n/routing";
import { QuickActions } from "@/components/patient/dashboard/quick-actions";
import { UpcomingWidget } from "@/components/patient/dashboard/upcoming-widget";
import { RecentDoctorsWidget } from "@/components/patient/dashboard/recent-doctors-widget";
import { RecentRecordsWidget } from "@/components/patient/dashboard/recent-records-widget";
import { PrescriptionsWidget } from "@/components/patient/dashboard/prescriptions-widget";
import { PaymentStatusWidget } from "@/components/patient/dashboard/payment-status-widget";
import { NotificationsWidget } from "@/components/patient/dashboard/notifications-widget";
import { AiShortcut } from "@/components/patient/dashboard/ai-shortcut";
import { GlanceStat, WelcomeBanner } from "@/components/portal/welcome-banner";
import { firstName } from "@/lib/utils";
import type { DashboardBundle } from "@/lib/patient/dashboard";

export async function DashboardGrid({ bundle }: { bundle: DashboardBundle }) {
  const t = await getTranslations("patient.dashboard");
  const session = await auth();
  const raw = session?.user?.name ?? session?.user?.email ?? "";
  const name = firstName(raw) || raw;
  const upcomingCount = bundle.upcoming.ok ? bundle.upcoming.data.length : "—";
  const unreadCount = bundle.notifications.ok ? bundle.notifications.data.unreadCount : "—";

  return (
    <div className="space-y-8">
      <WelcomeBanner
        title={t("welcome", { name })}
        subtitle={t("subtitle")}
        action={
          <Link
            href="/patient/appointments/book"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow-sm hover:bg-white/90"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden />
            {t("bookCta")}
          </Link>
        }
        aside={
          <>
            <GlanceStat label={t("glance.upcoming")} value={upcomingCount} />
            <GlanceStat label={t("glance.unread")} value={unreadCount} />
          </>
        }
      />

      <QuickActions />

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingWidget result={bundle.upcoming} />
        <NotificationsWidget result={bundle.notifications} />
        <RecentDoctorsWidget result={bundle.recentDoctors} />
        <PrescriptionsWidget result={bundle.activePrescriptions} />
        <RecentRecordsWidget result={bundle.recentRecords} />
        <PaymentStatusWidget result={bundle.paymentStatus} />
        <AiShortcut className="lg:col-span-2" />
      </div>
    </div>
  );
}
