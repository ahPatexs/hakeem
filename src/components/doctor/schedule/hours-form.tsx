"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  addDoctorUnavailableDay,
  removeDoctorUnavailableDay,
  saveDoctorHours,
} from "@/actions/doctor/hours";
import { minutesToTimeLabel, timeLabelToMinutes } from "@/domain/doctor/hours";

type HoursData = {
  timezone: string;
  week: Array<{ weekday: number; startMinutes: number; endMinutes: number }>;
  unavailable: Array<{ date: string; reason: string | null }>;
};

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

export function DoctorHoursForm({ initial }: { initial: HoursData }) {
  const t = useTranslations("doctor.schedule");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [offDate, setOffDate] = useState("");
  const [offReason, setOffReason] = useState("");
  const [unavailable, setUnavailable] = useState(initial.unavailable);

  const byWeekday = useMemo(() => {
    const map = new Map(initial.week.map((row) => [row.weekday, row]));
    return WEEKDAYS.map((weekday) => {
      const row = map.get(weekday);
      return {
        weekday,
        enabled: Boolean(row),
        start: minutesToTimeLabel(row?.startMinutes ?? 9 * 60),
        end: minutesToTimeLabel(row?.endMinutes ?? 17 * 60),
      };
    });
  }, [initial.week]);

  const [days, setDays] = useState(byWeekday);

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const week = days
      .filter((day) => day.enabled)
      .map((day) => {
        const startMinutes = timeLabelToMinutes(day.start);
        const endMinutes = timeLabelToMinutes(day.end);
        return {
          weekday: day.weekday,
          startMinutes: startMinutes ?? 0,
          endMinutes: endMinutes ?? 0,
        };
      });
    startTransition(async () => {
      const res = await saveDoctorHours({ timezone, week });
      if (!res.ok) {
        setError(t("hoursError"));
        return;
      }
      setMessage(t("hoursSaved"));
      router.refresh();
    });
  }

  function handleAddOffDay() {
    if (!offDate) return;
    setError(null);
    startTransition(async () => {
      const res = await addDoctorUnavailableDay({
        date: offDate,
        reason: offReason || undefined,
      });
      if (!res.ok) {
        setError(t("hoursError"));
        return;
      }
      setUnavailable(res.data.unavailable);
      setOffDate("");
      setOffReason("");
      router.refresh();
    });
  }

  function handleRemoveOffDay(date: string) {
    startTransition(async () => {
      const res = await removeDoctorUnavailableDay({ date });
      if (!res.ok) {
        setError(t("hoursError"));
        return;
      }
      setUnavailable(res.data.unavailable);
      router.refresh();
    });
  }

  return (
    <section className="glass-card space-y-5 rounded-3xl border border-outline-variant/20 p-5">
      <div>
        <h2 className="font-headline text-lg text-primary">{t("hoursTitle")}</h2>
        <p className="mt-1 text-sm text-on-surface-variant">{t("hoursHint")}</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-on-surface-variant">{t("timezone")}</span>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="h-10 w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 text-sm outline-none focus:border-primary"
          />
        </label>

        <ul className="grid gap-2">
          {days.map((day, index) => (
            <li
              key={day.weekday}
              className={`rounded-2xl border px-3 py-2.5 ${
                day.enabled ? "border-med-green/25 bg-med-green/5" : "border-outline-variant/15 bg-surface-container-low"
              }`}
            >
              <label className="flex items-center justify-between gap-2 text-sm font-medium text-primary">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => {
                      const next = [...days];
                      next[index] = { ...day, enabled: e.target.checked };
                      setDays(next);
                    }}
                    className="accent-med-green"
                  />
                  {t(`weekday.${day.weekday}` as "weekday.0")}
                </span>
                {!day.enabled ? <span className="text-xs font-normal text-on-surface-variant">{t("closed")}</span> : null}
              </label>
              {day.enabled ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-xs text-on-surface-variant">
                    <span>{t("hoursFrom")}</span>
                    <input
                      type="time"
                      step={1800}
                      value={day.start}
                      onChange={(e) => {
                        const next = [...days];
                        next[index] = { ...day, start: e.target.value };
                        setDays(next);
                      }}
                      className="h-9 w-full rounded-lg border border-outline-variant/30 bg-white px-2 text-sm text-primary"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-on-surface-variant">
                    <span>{t("end")}</span>
                    <input
                      type="time"
                      step={1800}
                      value={day.end}
                      onChange={(e) => {
                        const next = [...days];
                        next[index] = { ...day, end: e.target.value };
                        setDays(next);
                      }}
                      className="h-9 w-full rounded-lg border border-outline-variant/30 bg-white px-2 text-sm text-primary"
                    />
                  </label>
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {message ? <p className="text-sm text-med-green">{message}</p> : null}
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full rounded-full" disabled={pending}>
          {pending ? t("saveHours") + "…" : t("saveHours")}
        </Button>
      </form>

      <div className="space-y-3 border-t border-outline-variant/15 pt-4">
        <h3 className="font-medium text-primary">{t("unavailableTitle")}</h3>
        <div className="grid gap-2">
          <label className="space-y-1 text-sm">
            <span className="text-on-surface-variant">{t("unavailableDate")}</span>
            <input
              type="date"
              value={offDate}
              onChange={(e) => setOffDate(e.target.value)}
              className="block h-10 w-full rounded-xl border border-outline-variant/30 bg-transparent px-3"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-on-surface-variant">{t("unavailableReason")}</span>
            <input
              type="text"
              value={offReason}
              onChange={(e) => setOffReason(e.target.value)}
              maxLength={200}
              className="block h-10 w-full rounded-xl border border-outline-variant/30 bg-transparent px-3"
            />
          </label>
          <Button type="button" variant="outline" className="rounded-full" disabled={pending || !offDate} onClick={handleAddOffDay}>
            {t("addUnavailable")}
          </Button>
        </div>
        {unavailable.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t("unavailableEmpty")}</p>
        ) : (
          <ul className="space-y-2">
            {unavailable.map((row) => (
              <li
                key={row.date}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-outline-variant/15 px-3 py-2 text-sm"
              >
                <span>
                  {row.date}
                  {row.reason ? ` · ${row.reason}` : ""}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => handleRemoveOffDay(row.date)}
                >
                  {t("removeUnavailable")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
