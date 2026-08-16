import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { localDayKey, parseLocalDayKey, shiftLocalDay, weekDayKeys } from "@/lib/datetime";

export function ScheduleWeekNav({
  dateKey,
  locale,
  todayLabel,
  previousLabel,
  nextLabel,
  weekNavLabel,
  weekdayShort,
}: {
  dateKey: string;
  locale: string;
  todayLabel: string;
  previousLabel: string;
  nextLabel: string;
  weekNavLabel: string;
  weekdayShort: string[];
}) {
  const todayKey = localDayKey(new Date());
  const keys = weekDayKeys(dateKey);
  const tag = locale === "ar" ? "ar-SA" : "en-US";

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-2">
        <Link
          href={`/doctor/schedule?date=${shiftLocalDay(dateKey, -1)}`}
          aria-label={previousLabel}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
        <Link
          href="/doctor/schedule"
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-sm hover:bg-white/90"
        >
          {todayLabel}
        </Link>
        <Link
          href={`/doctor/schedule?date=${shiftLocalDay(dateKey, 1)}`}
          aria-label={nextLabel}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Link>
      </div>

      <nav className="grid grid-cols-7 gap-1.5" aria-label={weekNavLabel}>
        {keys.map((key) => {
          const d = parseLocalDayKey(key);
          const selected = key === dateKey;
          const isToday = key === todayKey;
          return (
            <Link
              key={key}
              href={`/doctor/schedule?date=${key}`}
              aria-current={selected ? "date" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center rounded-2xl px-1 py-2 text-center transition",
                selected
                  ? "bg-white text-primary shadow-sm"
                  : "text-white/85 hover:bg-white/12",
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                {weekdayShort[d.getDay()] ?? ""}
              </span>
              <span className="mt-0.5 text-base font-bold tabular-nums">
                {d.toLocaleDateString(tag, { day: "numeric" })}
              </span>
              {isToday && !selected ? (
                <span className="mt-1 h-1 w-1 rounded-full bg-white" aria-hidden />
              ) : (
                <span className="mt-1 h-1 w-1" aria-hidden />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
