"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { ErrorState } from "@/components/patient/shared/error-state";
import { StatusBadge } from "@/components/patient/shared/status-badge";
import type { WidgetResult, UpcomingAppointment } from "@/lib/patient/dashboard";
import { useRouter } from "@/i18n/routing";

export function UpcomingWidget({ result }: { result: WidgetResult<UpcomingAppointment[]> }) {
  const t = useTranslations("patient.dashboard.upcoming");
  const router = useRouter();

  if (!result.ok) {
    return (
      <WidgetShell title={t("title")}>
        <ErrorState message={t("error")} onRetry={() => router.refresh()} />
      </WidgetShell>
    );
  }

  if (result.data.length === 0) {
    return (
      <WidgetShell title={t("title")}>
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          actionLabel={t("book")}
          actionHref="/patient/appointments/book"
        />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell title={t("title")} href="/patient/appointments/upcoming">
      <ul className="divide-y divide-outline-variant/15">
        {result.data.map((appt) => (
          <li key={appt.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <Link
                href={`/patient/appointments/${appt.id}`}
                className="font-medium text-primary hover:underline"
              >
                {appt.doctor.nameEn}
              </Link>
              <p className="text-sm text-on-surface-variant">
                {new Date(appt.startAt).toLocaleString()}
              </p>
            </div>
            <StatusBadge status={appt.status} variant="appointment" />
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

function WidgetShell({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-card rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 md:p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-headline text-lg text-primary">{title}</h2>
        {href ? (
          <Link href={href} className="text-sm font-medium text-med-green hover:underline">
            View all
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
