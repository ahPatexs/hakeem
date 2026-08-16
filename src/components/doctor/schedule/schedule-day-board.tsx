import { MapPin, Video } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AppointmentActions } from "@/components/doctor/schedule/appointment-actions";
import { EmptyState, StatusBadge } from "@/components/doctor/shared";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { formatApptTime } from "@/lib/datetime";
import { portalCardClass } from "@/components/portal/chrome";
import { cn } from "@/lib/utils";
import type { ScheduleAppointment } from "@/lib/doctor/schedule";

export function ScheduleDayBoard({
  items,
  locale,
  emptyTitle,
  emptyDescription,
  videoLabel,
  inPersonLabel,
  statusLabel,
}: {
  items: ScheduleAppointment[];
  locale: string;
  emptyTitle: string;
  emptyDescription: string;
  videoLabel: string;
  inPersonLabel: string;
  statusLabel: (status: string) => string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <ol className="space-y-3">
      {items.map((appt) => {
        const name = appt.patient.name ?? appt.patient.email;
        const video = appt.mode === "VIDEO";
        return (
          <li key={appt.id} className={cn(portalCardClass, "overflow-hidden")}>
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:p-0">
              <div className="flex shrink-0 items-center gap-3 sm:w-28 sm:flex-col sm:items-center sm:justify-center sm:bg-primary/5 sm:py-5">
                <p className="text-lg font-bold tabular-nums leading-none text-primary">
                  {formatApptTime(appt.startAt, locale)}
                </p>
                <p className="text-xs font-medium text-on-surface-variant">
                  {formatApptTime(appt.endAt, locale)}
                </p>
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-3 sm:py-4 sm:pe-4">
                <div className="flex min-w-0 items-start gap-3">
                  <PersonAvatar name={name} photoUrl={appt.patient.image} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/doctor/appointments/${appt.id}`}
                        className="truncate font-semibold text-primary hover:underline"
                      >
                        {name}
                      </Link>
                      <StatusBadge status={appt.status} label={statusLabel(appt.status)} variant="appointment" />
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-surface-variant">
                      <span className="inline-flex items-center gap-1.5">
                        {video ? (
                          <Video className="h-3.5 w-3.5 text-med-green" aria-hidden />
                        ) : (
                          <MapPin className="h-3.5 w-3.5 text-med-green" aria-hidden />
                        )}
                        {video ? videoLabel : inPersonLabel}
                      </span>
                      {appt.reason ? <span className="truncate">{appt.reason}</span> : null}
                    </p>
                  </div>
                </div>
                <AppointmentActions appointmentId={appt.id} status={appt.status} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
