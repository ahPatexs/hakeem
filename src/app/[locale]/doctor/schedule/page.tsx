import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSchedule } from "@/actions/doctor/schedule";
import { getDoctorHours } from "@/actions/doctor/hours";
import { DoctorHoursForm } from "@/components/doctor/schedule/hours-form";
import { ScheduleDayBoard } from "@/components/doctor/schedule/schedule-day-board";
import { ScheduleWeekNav } from "@/components/doctor/schedule/schedule-week-nav";
import { ErrorState } from "@/components/doctor/shared";
import { minutesToTimeLabel } from "@/domain/doctor/hours";
import { parseLocalDayKey } from "@/lib/datetime";

export default async function DoctorSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { date } = await searchParams;
  const t = await getTranslations("doctor.schedule");
  const ts = await getTranslations("doctor.status");

  const result = await getSchedule(date);
  const hours = await getDoctorHours();
  if (!result.ok) {
    return <ErrorState title={t("title")} message={t("loadError")} />;
  }

  const { items, dateKey } = result.data;
  const selected = parseLocalDayKey(dateKey);
  const dateLabel = selected.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const weekday = selected.getDay();
  const window = hours.ok ? hours.data.week.find((row) => row.weekday === weekday) : undefined;
  const off = hours.ok ? hours.data.unavailable.find((row) => row.date === dateKey) : undefined;
  const videoCount = items.filter((item) => item.mode === "VIDEO").length;
  const weekdayShort = [0, 1, 2, 3, 4, 5, 6].map((day) => t(`weekdayShort.${day}` as "weekdayShort.0"));

  return (
    <div className="space-y-6">
      <section className="welcome-banner space-y-5 p-5 sm:p-7">
        <div>
          <p className="text-sm font-medium text-white/80">{t("subtitle")}</p>
          <h1 className="font-headline mt-1 text-2xl text-white md:text-3xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-white/85">{dateLabel}</p>
        </div>
        <ScheduleWeekNav
          dateKey={dateKey}
          locale={locale}
          todayLabel={t("today")}
          previousLabel={t("previousDay")}
          nextLabel={t("nextDay")}
          weekNavLabel={t("weekNav")}
          weekdayShort={weekdayShort}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-white">{items.length}</p>
            <p className="text-xs font-medium text-white/80">{t("visitsCount")}</p>
          </div>
          <div className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-2xl font-bold tabular-nums text-white">{videoCount}</p>
            <p className="text-xs font-medium text-white/80">{t("videoCount")}</p>
          </div>
          <div className="rounded-2xl bg-white/12 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              {off
                ? t("dayOff")
                : window
                  ? `${minutesToTimeLabel(window.startMinutes)} – ${minutesToTimeLabel(window.endMinutes)}`
                  : t("closed")}
            </p>
            <p className="text-xs font-medium text-white/80">{t("hoursToday")}</p>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-3">
          {off ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t("dayOffBanner")}
              {off.reason ? ` · ${off.reason}` : ""}
            </p>
          ) : null}
          <ScheduleDayBoard
            items={items}
            locale={locale}
            emptyTitle={t("emptyTitle")}
            emptyDescription={t("emptyDescription")}
            videoLabel={t("video")}
            inPersonLabel={t("inPerson")}
            statusLabel={(status) => ts(status)}
          />
        </div>
        {hours.ok ? (
          <aside className="xl:sticky xl:top-24">
            <DoctorHoursForm initial={hours.data} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
