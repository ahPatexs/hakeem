"use client";

import { ChevronRight, MapPin, Video } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { StatusBadge } from "@/components/patient/shared/status-badge";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { formatApptWhen } from "@/lib/datetime";
import { localizedText } from "@/lib/utils";
import type { Appointment, Doctor } from "@prisma/client";

type ApptRow = Appointment & {
  doctor: Pick<Doctor, "id" | "slug" | "nameEn" | "nameAr" | "photoUrl">;
  rating?: { id: string; score: number } | null;
};

export function AppointmentList({
  items,
  total,
  page,
  pageSize,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  items: ApptRow[];
  total: number;
  page: number;
  pageSize: number;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: { label: string; href: string };
}) {
  const t = useTranslations("patient.appointments");
  const ts = useTranslations("patient.appointments.status");
  const locale = useLocale();

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyAction?.label}
        actionHref={emptyAction?.href}
      />
    );
  }

  return (
    <div>
      <ul className="space-y-3">
        {items.map((appt) => {
          const name = localizedText(locale, appt.doctor.nameEn, appt.doctor.nameAr);
          return (
            <li key={appt.id}>
              <Link
                href={`/patient/appointments/${appt.id}`}
                className="glass-card flex items-center gap-4 rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm transition hover:border-med-green/30 hover:shadow-md"
              >
                <PersonAvatar name={name} photoUrl={appt.doctor.photoUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-primary">{name}</p>
                    <StatusBadge
                      status={appt.status}
                      variant="appointment"
                      label={ts(appt.status)}
                    />
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-on-surface-variant">
                    <span>{formatApptWhen(appt.startAt, locale)}</span>
                    <span className="inline-flex items-center gap-1">
                      {appt.mode === "VIDEO" ? (
                        <Video className="h-3.5 w-3.5 text-med-green" aria-hidden />
                      ) : (
                        <MapPin className="h-3.5 w-3.5 text-med-green" aria-hidden />
                      )}
                      {t(`mode.${appt.mode}`)}
                    </span>
                    {appt.status === "COMPLETED" ? (
                      <span className="text-xs font-semibold text-med-green">
                        {appt.rating ? t("yourRating") + ` · ${appt.rating.score}/5` : t("rateCta")}
                      </span>
                    ) : null}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-on-surface-variant rtl:rotate-180" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
