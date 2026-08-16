import { describe, expect, it } from "vitest";
import { validateWeeklyHours, validateWeeklyWindow } from "@/domain/doctor/hours";
import {
  addCalendarDays,
  classifyRequestedSlot,
  generateDoctorAvailability,
} from "@/lib/patient/availability";

const TZ = "Asia/Riyadh";

const sunThu = [0, 1, 2, 3, 4].map((weekday) => ({
  weekday,
  startMinutes: 9 * 60,
  endMinutes: 17 * 60,
}));

describe("hours validation", () => {
  it("rejects weekday outside 0-6", () => {
    expect(validateWeeklyWindow({ weekday: 7, startMinutes: 540, endMinutes: 1020 })).toBe(
      "WEEKDAY_INVALID",
    );
  });

  it("rejects windows that are not 30-minute aligned", () => {
    expect(validateWeeklyWindow({ weekday: 0, startMinutes: 540, endMinutes: 550 })).toBe(
      "HOURS_OVERLAP",
    );
    expect(validateWeeklyWindow({ weekday: 0, startMinutes: 545, endMinutes: 1020 })).toBe(
      "HOURS_OVERLAP",
    );
  });

  it("rejects end not after start", () => {
    expect(validateWeeklyWindow({ weekday: 0, startMinutes: 600, endMinutes: 600 })).toBe(
      "HOURS_OVERLAP",
    );
  });

  it("rejects duplicate weekdays", () => {
    expect(
      validateWeeklyHours([
        { weekday: 0, startMinutes: 540, endMinutes: 600 },
        { weekday: 0, startMinutes: 600, endMinutes: 660 },
      ]),
    ).toBe("WEEKDAY_INVALID");
  });
});

describe("slot generation", () => {
  it("returns NO_HOURS when week is empty", () => {
    const result = generateDoctorAvailability({
      week: [],
      unavailableDates: [],
      appointments: [],
      timezone: TZ,
      now: new Date("2026-08-13T07:00:00.000Z"),
    });
    expect(result.slots).toEqual([]);
    expect(result.unavailableReason).toBe("NO_HOURS");
  });

  it("splits hours into 30-minute slots and skips past starts", () => {
    const now = new Date("2026-08-13T05:00:00.000Z");
    const result = generateDoctorAvailability({
      week: [{ weekday: 4, startMinutes: 9 * 60, endMinutes: 11 * 60 }],
      unavailableDates: [],
      appointments: [],
      timezone: TZ,
      now,
    });
    const thursday = result.slots.filter((slot) => slot.startAt.startsWith("2026-08-13"));
    expect(thursday.map((slot) => slot.startAt)).toEqual([
      "2026-08-13T06:00:00.000Z",
      "2026-08-13T06:30:00.000Z",
      "2026-08-13T07:00:00.000Z",
      "2026-08-13T07:30:00.000Z",
    ]);
  });

  it("skips unavailable days and overlapping blocking appointments", () => {
    const now = new Date("2026-08-12T06:00:00.000Z");
    const result = generateDoctorAvailability({
      week: [{ weekday: 4, startMinutes: 9 * 60, endMinutes: 10 * 60 }],
      unavailableDates: ["2026-08-13"],
      appointments: [
        {
          startAt: new Date("2026-08-20T06:00:00.000Z"),
          endAt: new Date("2026-08-20T06:30:00.000Z"),
          status: "CONFIRMED",
          holdExpiresAt: null,
        },
      ],
      timezone: TZ,
      now,
    });
    expect(result.slots.some((slot) => slot.startAt.startsWith("2026-08-13"))).toBe(false);
    expect(result.slots.some((slot) => slot.startAt === "2026-08-20T06:00:00.000Z")).toBe(false);
    expect(result.slots.some((slot) => slot.startAt === "2026-08-20T06:30:00.000Z")).toBe(true);
  });

  it("does not treat expired holds as blocking", () => {
    const now = new Date("2026-08-13T05:00:00.000Z");
    const result = generateDoctorAvailability({
      week: [{ weekday: 4, startMinutes: 9 * 60, endMinutes: 9 * 60 + 30 }],
      unavailableDates: [],
      appointments: [
        {
          startAt: new Date("2026-08-13T06:00:00.000Z"),
          endAt: new Date("2026-08-13T06:30:00.000Z"),
          status: "HELD",
          holdExpiresAt: new Date("2026-08-13T04:00:00.000Z"),
        },
      ],
      timezone: TZ,
      now,
    });
    expect(result.slots.some((slot) => slot.startAt === "2026-08-13T06:00:00.000Z")).toBe(true);
  });

  it("does not offer slots beyond 14 calendar days", () => {
    const now = new Date("2026-08-13T07:00:00.000Z");
    const today = "2026-08-13";
    const day13 = addCalendarDays(today, 13);
    const day14 = addCalendarDays(today, 14);
    const result = generateDoctorAvailability({
      week: sunThu,
      unavailableDates: [],
      appointments: [],
      timezone: TZ,
      now,
    });
    expect(result.slots.some((slot) => slot.startAt.startsWith(day13))).toBe(true);
    expect(result.slots.some((slot) => slot.startAt.startsWith(day14))).toBe(false);
  });
});

describe("requested slot classification", () => {
  const week = [{ weekday: 4, startMinutes: 9 * 60, endMinutes: 12 * 60 }];
  const now = new Date("2026-08-13T05:00:00.000Z");

  it("rejects starts past the 14-day horizon", () => {
    const startAt = new Date("2026-08-28T06:00:00.000Z");
    expect(
      classifyRequestedSlot({
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
        week,
        unavailableDates: [],
        appointments: [],
        timezone: TZ,
        now,
      }),
    ).toBe("SLOT_HORIZON");
  });

  it("rejects times outside published hours", () => {
    const startAt = new Date("2026-08-14T06:00:00.000Z");
    expect(
      classifyRequestedSlot({
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
        week,
        unavailableDates: [],
        appointments: [],
        timezone: TZ,
        now,
      }),
    ).toBe("SLOT_OUTSIDE_HOURS");
  });

  it("rejects overlap with a confirmed visit", () => {
    const startAt = new Date("2026-08-13T06:00:00.000Z");
    expect(
      classifyRequestedSlot({
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
        week,
        unavailableDates: [],
        appointments: [
          {
            startAt,
            endAt: new Date(startAt.getTime() + 30 * 60 * 1000),
            status: "CHECKED_IN",
            holdExpiresAt: null,
          },
        ],
        timezone: TZ,
        now,
      }),
    ).toBe("SLOT_UNAVAILABLE");
  });
});
