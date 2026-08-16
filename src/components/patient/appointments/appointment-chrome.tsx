"use client";

import { CalendarPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { segmentedOptionClass, segmentedTrackClass } from "@/components/portal/chrome";

export function AppointmentPageHeader({
  title,
  subtitle,
  showBook = true,
  showTabs = true,
}: {
  title: string;
  subtitle?: string;
  showBook?: boolean;
  showTabs?: boolean;
}) {
  const t = useTranslations("patient.appointments");
  const pathname = usePathname();
  const tabs = [
    { href: "/patient/appointments/upcoming", key: "tabUpcoming" as const },
    { href: "/patient/appointments/history", key: "tabHistory" as const },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-headline text-2xl text-primary md:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 text-on-surface-variant">{subtitle}</p> : null}
        </div>
        {showBook ? (
          <Link
            href="/patient/appointments/book"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden />
            {t("book")}
          </Link>
        ) : null}
      </div>
      {showTabs ? (
        <nav className={segmentedTrackClass} aria-label={t("upcomingTitle")}>
          {tabs.map((tab) => {
            const active =
              tab.href === "/patient/appointments/upcoming"
                ? pathname === "/patient/appointments" ||
                  pathname === "/patient/appointments/upcoming" ||
                  pathname.startsWith("/patient/appointments/upcoming/")
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={segmentedOptionClass(active)}
                aria-current={active ? "page" : undefined}
              >
                {t(tab.key)}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
