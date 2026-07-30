"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { StatusBadge } from "@/components/patient/shared/status-badge";
import { Pagination } from "@/components/patient/shared/pagination";
import { EmptyState } from "@/components/patient/shared/empty-state";
import type { Appointment, Doctor } from "@prisma/client";

type ApptRow = Appointment & {
  doctor: Pick<Doctor, "id" | "slug" | "nameEn" | "nameAr" | "photoUrl">;
};

export function AppointmentList({
  items,
  total,
  page,
  pageSize,
  emptyTitle,
  emptyAction,
}: {
  items: ApptRow[];
  total: number;
  page: number;
  pageSize: number;
  emptyTitle: string;
  emptyAction?: { label: string; href: string };
}) {
  const t = useTranslations("patient.appointments");

  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        actionLabel={emptyAction?.label}
        actionHref={emptyAction?.href}
      />
    );
  }

  return (
    <div>
      <ul className="divide-y divide-outline-variant/15 rounded-2xl border border-outline-variant/20 bg-surface-container-low">
        {items.map((appt) => (
          <li key={appt.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <Link href={`/patient/appointments/${appt.id}`} className="font-medium text-primary hover:underline">
                {appt.doctor.nameEn}
              </Link>
              <p className="text-sm text-on-surface-variant">
                {new Date(appt.startAt).toLocaleString()} · {t(`mode.${appt.mode}`)}
              </p>
            </div>
            <StatusBadge status={appt.status} variant="appointment" />
          </li>
        ))}
      </ul>
      <Pagination page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
