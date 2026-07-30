import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { QuickActions } from "@/components/patient/dashboard/quick-actions";
import { UpcomingWidget } from "@/components/patient/dashboard/upcoming-widget";
import { RecentDoctorsWidget } from "@/components/patient/dashboard/recent-doctors-widget";
import { RecentRecordsWidget } from "@/components/patient/dashboard/recent-records-widget";
import { PrescriptionsWidget } from "@/components/patient/dashboard/prescriptions-widget";
import { PaymentStatusWidget } from "@/components/patient/dashboard/payment-status-widget";
import { NotificationsWidget } from "@/components/patient/dashboard/notifications-widget";
import { AiShortcut } from "@/components/patient/dashboard/ai-shortcut";
import type { DashboardBundle } from "@/lib/patient/dashboard";

export async function DashboardGrid({ bundle }: { bundle: DashboardBundle }) {
  const t = await getTranslations("patient.dashboard");
  const session = await auth();
  const name = session?.user?.name ?? session?.user?.email ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-2xl text-primary md:text-3xl">
          {t("welcome", { name })}
        </h1>
        <p className="mt-1 text-on-surface-variant">{t("subtitle")}</p>
      </div>

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
