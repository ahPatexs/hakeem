"use client";

import { Video, MapPin } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { formatApptDay, formatApptTime, groupByZonedDay } from "@/lib/datetime";
import { segmentedOptionClass, segmentedTrackClass } from "@/components/portal/chrome";
import type { AvailabilitySlot } from "@/lib/patient/availability";

export function VisitModeToggle({
  value,
  onChange,
  videoLabel,
  inPersonLabel,
}: {
  value: "VIDEO" | "IN_PERSON";
  onChange: (mode: "VIDEO" | "IN_PERSON") => void;
  videoLabel: string;
  inPersonLabel: string;
}) {
  const options = [
    { id: "VIDEO" as const, label: videoLabel, icon: Video },
    { id: "IN_PERSON" as const, label: inPersonLabel, icon: MapPin },
  ];

  return (
    <div className={segmentedTrackClass} role="group">
      {options.map((option) => {
        const Icon = option.icon;
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={segmentedOptionClass(active)}
            aria-pressed={active}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function SlotPicker({
  slots,
  selectedStartAt,
  onSelect,
  emptyLabel,
  timeZone,
}: {
  slots: AvailabilitySlot[];
  selectedStartAt?: string | null;
  onSelect: (slot: AvailabilitySlot) => void;
  emptyLabel: string;
  timeZone?: string;
}) {
  const locale = useLocale();
  const groups = groupByZonedDay(slots, timeZone);

  if (groups.length === 0) {
    return <p className="text-sm text-on-surface-variant">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="text-sm font-semibold text-primary">{formatApptDay(group.items[0].startAt, locale)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.items.map((slot) => {
              const active = selectedStartAt === slot.startAt;
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  onClick={() => onSelect(slot)}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-semibold tabular-nums transition",
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "border border-outline-variant/30 bg-surface-container-lowest text-primary hover:border-med-green/40 hover:bg-med-green/5",
                  )}
                  aria-pressed={active}
                >
                  {formatApptTime(slot.startAt, locale)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
