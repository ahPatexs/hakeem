"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import {
  Bot,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  ListChecks,
  Pill,
  Star,
  Users,
} from "lucide-react";
import { ActionTiles } from "@/components/portal/action-tiles";
import { EmptyState, ErrorState, StatusBadge } from "@/components/doctor/shared";
import { WidgetShell } from "@/components/doctor/shared/widget-shell";
import type {
  DoctorDashboardBundle,
  DoctorDashboardStats,
  PendingNote,
  ScheduleItem,
  WidgetResult,
} from "@/lib/doctor/dashboard";
import type { Notification } from "@prisma/client";

function useFmt() {
  const locale = useLocale();
  return {
    time: (d: Date | string) =>
      new Date(d).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    dateTime: (d: Date | string) =>
      new Date(d).toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
  };
}

export function StatsRow({ result }: { result: WidgetResult<DoctorDashboardStats> }) {
  const t = useTranslations("doctor.dashboard.stats");
  if (!result.ok) return null;
  const s = result.data;
  const cells = [
    { label: t("completed"), value: s.todayCompleted, icon: CalendarCheck },
    { label: t("pendingNotes"), value: s.pendingNotes, icon: ClipboardList },
    { label: t("weekUpcoming"), value: s.weekUpcoming, icon: CalendarDays },
    {
      label: t("rating"),
      value: s.ratingCount > 0 ? s.ratingAvg.toFixed(1) : "—",
      icon: Star,
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cells.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.label}
            className="flex items-center gap-3 rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-4 shadow-sm"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums text-primary">{c.value}</p>
              <p className="text-xs font-medium text-on-surface-variant">{c.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TodayScheduleWidget({
  result,
}: {
  result: WidgetResult<{ items: ScheduleItem[]; total: number }>;
}) {
  const t = useTranslations("doctor.dashboard.today");
  const ts = useTranslations("doctor.status");
  const router = useRouter();
  const fmt = useFmt();

  if (!result.ok) {
    return (
      <WidgetShell title={t("title")}>
        <ErrorState message={t("error")} onRetry={() => router.refresh()} />
      </WidgetShell>
    );
  }
  if (result.data.items.length === 0) {
    return (
      <WidgetShell title={t("title")}>
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      </WidgetShell>
    );
  }
  return (
    <WidgetShell title={t("title")} href="/doctor/schedule" hrefLabel={t("viewFull")}>
      <ul className="divide-y divide-outline-variant/15">
        {result.data.items.map((appt) => (
          <li key={appt.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <Link
                href={`/doctor/appointments/${appt.id}`}
                className="font-medium text-primary hover:underline"
              >
                {appt.patient.name ?? appt.patient.email}
              </Link>
              <p className="text-sm text-on-surface-variant">
                {fmt.time(appt.startAt)} · {appt.mode === "VIDEO" ? "🎥" : "🏥"}
              </p>
            </div>
            <StatusBadge status={appt.status} label={ts(appt.status)} variant="appointment" />
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function UpcomingWidget({ result }: { result: WidgetResult<ScheduleItem[]> }) {
  const t = useTranslations("doctor.dashboard.upcoming");
  const ts = useTranslations("doctor.status");
  const router = useRouter();
  const fmt = useFmt();

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
        <EmptyState title={t("emptyTitle")} />
      </WidgetShell>
    );
  }
  return (
    <WidgetShell title={t("title")} href="/doctor/schedule" hrefLabel={t("viewAll")}>
      <ul className="divide-y divide-outline-variant/15">
        {result.data.map((appt) => (
          <li key={appt.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <Link
                href={`/doctor/appointments/${appt.id}`}
                className="font-medium text-primary hover:underline"
              >
                {appt.patient.name ?? appt.patient.email}
              </Link>
              <p className="text-sm text-on-surface-variant">{fmt.dateTime(appt.startAt)}</p>
            </div>
            <StatusBadge status={appt.status} label={ts(appt.status)} variant="appointment" />
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function PendingNotesWidget({ result }: { result: WidgetResult<PendingNote[]> }) {
  const t = useTranslations("doctor.dashboard.pendingNotes");
  const router = useRouter();
  const fmt = useFmt();

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
        <EmptyState title={t("emptyTitle")} />
      </WidgetShell>
    );
  }
  return (
    <WidgetShell title={t("title")}>
      <ul className="divide-y divide-outline-variant/15">
        {result.data.map((note) => (
          <li key={note.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="truncate font-medium text-primary">{note.patient.name ?? "—"}</p>
              <p className="text-sm text-on-surface-variant">{fmt.dateTime(note.updatedAt)}</p>
            </div>
            <Link
              href={`/doctor/consultations/${note.appointmentId}`}
              className="text-sm font-medium text-med-green hover:underline"
            >
              {t("openNote")}
            </Link>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function NotificationsWidget({
  result,
}: {
  result: WidgetResult<{ unreadCount: number; items: Notification[] }>;
}) {
  const t = useTranslations("doctor.dashboard.notifications");
  const router = useRouter();
  const fmt = useFmt();

  if (!result.ok) {
    return (
      <WidgetShell title={t("title")}>
        <ErrorState message={t("error")} onRetry={() => router.refresh()} />
      </WidgetShell>
    );
  }
  if (result.data.items.length === 0) {
    return (
      <WidgetShell title={t("title")} href="/doctor/notifications" hrefLabel={t("viewAll")}>
        <EmptyState title={t("emptyTitle")} />
      </WidgetShell>
    );
  }
  return (
    <WidgetShell title={t("title")} href="/doctor/notifications" hrefLabel={t("viewAll")}>
      <ul className="divide-y divide-outline-variant/15">
        {result.data.items.map((n) => (
          <li key={n.id} className="py-3 first:pt-0 last:pb-0">
            <p className={n.readAt ? "text-on-surface-variant" : "font-medium text-primary"}>
              {n.title}
            </p>
            <p className="text-xs text-on-surface-variant">{fmt.dateTime(n.createdAt)}</p>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}

export function QuickActions() {
  const t = useTranslations("doctor.dashboard.quickActions");
  return (
    <section aria-label={t("title")} className="space-y-4">
      <h2 className="font-headline text-lg text-primary">{t("title")}</h2>
      <ActionTiles
        actions={[
          { href: "/doctor/queue", label: t("queue"), icon: ListChecks },
          { href: "/doctor/prescriptions", label: t("newRx"), icon: Pill },
          { href: "/doctor/labs", label: t("labs"), icon: FlaskConical },
          { href: "/doctor/ai", label: t("ai"), icon: Bot },
          { href: "/doctor/patients", label: t("patients"), icon: Users },
          { href: "/doctor/schedule", label: t("schedule"), icon: CalendarDays },
        ]}
      />
    </section>
  );
}

export function DashboardWidgets({ bundle }: { bundle: DoctorDashboardBundle }) {
  return (
    <>
      <StatsRow result={bundle.stats} />
      <QuickActions />
      <div className="grid gap-6 lg:grid-cols-2">
        <TodayScheduleWidget result={bundle.today} />
        <UpcomingWidget result={bundle.upcoming} />
        <PendingNotesWidget result={bundle.pendingNotes} />
        <NotificationsWidget result={bundle.notifications} />
      </div>
    </>
  );
}
