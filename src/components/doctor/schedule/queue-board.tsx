import { CalendarDays, MapPin, Video } from "lucide-react";
import { Link } from "@/i18n/routing";
import { AppointmentActions } from "@/components/doctor/schedule/appointment-actions";
import { EmptyState, StatusBadge } from "@/components/doctor/shared";
import { PersonAvatar } from "@/components/portal/person-avatar";
import { portalCardClass } from "@/components/portal/chrome";
import { formatApptTime, waitMinutesSince } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { ScheduleAppointment } from "@/lib/doctor/schedule";

function QueueCard({
  appt,
  locale,
  position,
  highlight,
  videoLabel,
  inPersonLabel,
  arrivedLabel,
  waitLabel,
  scheduledLabel,
  statusLabel,
  liveLabel,
}: {
  appt: ScheduleAppointment;
  locale: string;
  position?: number;
  highlight?: boolean;
  videoLabel: string;
  inPersonLabel: string;
  arrivedLabel: (time: string) => string;
  waitLabel: (minutes: number) => string;
  scheduledLabel: (time: string) => string;
  statusLabel: (status: string) => string;
  liveLabel: string;
}) {
  const name = appt.patient.name ?? appt.patient.email;
  const video = appt.mode === "VIDEO";
  const arrived = appt.checkedInAt ? formatApptTime(appt.checkedInAt, locale) : null;
  const waited = waitMinutesSince(appt.checkedInAt);

  return (
    <li className={cn(portalCardClass, "overflow-hidden", highlight && "ring-2 ring-med-green/40")}>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:p-0">
        <div
          className={cn(
            "flex shrink-0 items-center gap-3 sm:w-24 sm:flex-col sm:items-center sm:justify-center sm:py-5",
            highlight ? "sm:bg-med-green/10" : "sm:bg-primary/5",
          )}
        >
          {position != null ? (
            <p className="text-2xl font-bold tabular-nums leading-none text-primary">#{position}</p>
          ) : (
            <span className="rounded-full bg-med-green px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
              {liveLabel}
            </span>
          )}
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
                <span>{scheduledLabel(formatApptTime(appt.startAt, locale))}</span>
                {arrived ? <span>{arrivedLabel(arrived)}</span> : null}
                {appt.status === "CHECKED_IN" && waited > 0 ? <span>{waitLabel(waited)}</span> : null}
                {appt.reason ? <span className="truncate">{appt.reason}</span> : null}
              </p>
            </div>
          </div>
          <AppointmentActions appointmentId={appt.id} status={appt.status} />
        </div>
      </div>
    </li>
  );
}

export function QueueBoard({
  checkedIn,
  inProgress,
  locale,
  emptyTitle,
  emptyDescription,
  waitingTitle,
  inProgressTitle,
  nowEmpty,
  videoLabel,
  inPersonLabel,
  liveLabel,
  arrivedLabel,
  waitLabel,
  scheduledLabel,
  statusLabel,
}: {
  checkedIn: ScheduleAppointment[];
  inProgress: ScheduleAppointment[];
  locale: string;
  emptyTitle: string;
  emptyDescription: string;
  waitingTitle: string;
  inProgressTitle: string;
  nowEmpty: string;
  videoLabel: string;
  inPersonLabel: string;
  liveLabel: string;
  arrivedLabel: (time: string) => string;
  waitLabel: (minutes: number) => string;
  scheduledLabel: (time: string) => string;
  statusLabel: (status: string) => string;
}) {
  if (checkedIn.length === 0 && inProgress.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <section className="space-y-3">
        <h2 className="font-headline text-lg text-primary">{inProgressTitle}</h2>
        {inProgress.length === 0 ? (
          <p className={cn(portalCardClass, "px-5 py-8 text-center text-sm text-on-surface-variant")}>{nowEmpty}</p>
        ) : (
          <ol className="space-y-3">
            {inProgress.map((appt) => (
              <QueueCard
                key={appt.id}
                appt={appt}
                locale={locale}
                highlight
                liveLabel={liveLabel}
                videoLabel={videoLabel}
                inPersonLabel={inPersonLabel}
                arrivedLabel={arrivedLabel}
                waitLabel={waitLabel}
                scheduledLabel={scheduledLabel}
                statusLabel={statusLabel}
              />
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-headline text-lg text-primary">{waitingTitle}</h2>
        {checkedIn.length === 0 ? (
          <p className={cn(portalCardClass, "px-5 py-8 text-center text-sm text-on-surface-variant")}>{emptyDescription}</p>
        ) : (
          <ol className="space-y-3">
            {checkedIn.map((appt, index) => (
              <QueueCard
                key={appt.id}
                appt={appt}
                locale={locale}
                position={index + 1}
                liveLabel={liveLabel}
                videoLabel={videoLabel}
                inPersonLabel={inPersonLabel}
                arrivedLabel={arrivedLabel}
                waitLabel={waitLabel}
                scheduledLabel={scheduledLabel}
                statusLabel={statusLabel}
              />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

export function QueueScheduleLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-white/90"
    >
      <CalendarDays className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
