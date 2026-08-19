import { prisma } from "@/lib/prisma";
import {
  DEFAULT_HOURS_TIMEZONE,
  assertUnavailableDate,
  assertWeeklyHours,
  type UnavailableDayInput,
  type WeeklyHoursWindow,
} from "@/domain/doctor/hours";
import { CareLoopError } from "@/domain/care-loop/errors";

function ymdFromPrismaDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function ymdToPrismaDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export async function getDoctorHoursRecord(doctorId: string) {
  const [week, unavailable, extras] = await Promise.all([
    prisma.doctorWeeklyHours.findMany({
      where: { doctorId },
      orderBy: { weekday: "asc" },
    }),
    prisma.doctorUnavailableDay.findMany({
      where: { doctorId },
      orderBy: { date: "asc" },
    }),
    prisma.user.findFirst({
      where: { doctorProfileId: doctorId, role: "DOCTOR" },
      select: { doctorProfileExtras: { select: { timezone: true } } },
    }),
  ]);

  return {
    timezone: extras?.doctorProfileExtras?.timezone || week[0]?.timezone || DEFAULT_HOURS_TIMEZONE,
    week: week.map((row) => ({
      weekday: row.weekday,
      startMinutes: row.startMinutes,
      endMinutes: row.endMinutes,
    })),
    unavailable: unavailable.map((row) => ({
      date: ymdFromPrismaDate(row.date),
      reason: row.reason,
    })),
  };
}

export async function saveDoctorHoursRecord(
  doctorId: string,
  input: { timezone?: string; week: WeeklyHoursWindow[] },
) {
  assertWeeklyHours(input.week);
  const timezone = input.timezone?.trim() || DEFAULT_HOURS_TIMEZONE;

  await prisma.$transaction(async (tx) => {
    await tx.doctorWeeklyHours.deleteMany({ where: { doctorId } });
    if (input.week.length > 0) {
      await tx.doctorWeeklyHours.createMany({
        data: input.week.map((window) => ({
          doctorId,
          weekday: window.weekday,
          startMinutes: window.startMinutes,
          endMinutes: window.endMinutes,
          timezone,
        })),
      });
    }
  });

  return getDoctorHoursRecord(doctorId);
}

export async function addDoctorUnavailableDayRecord(
  doctorId: string,
  input: UnavailableDayInput,
) {
  assertUnavailableDate(input.date);
  const reason = input.reason?.trim() ? input.reason.trim().slice(0, 200) : null;
  try {
    await prisma.doctorUnavailableDay.create({
      data: {
        doctorId,
        date: ymdToPrismaDate(input.date),
        reason,
      },
    });
  } catch {
    throw new CareLoopError("VALIDATION_ERROR", "Unavailable day already exists");
  }
  return getDoctorHoursRecord(doctorId);
}

export async function removeDoctorUnavailableDayRecord(doctorId: string, date: string) {
  assertUnavailableDate(date);
  await prisma.doctorUnavailableDay.deleteMany({
    where: { doctorId, date: ymdToPrismaDate(date) },
  });
  return getDoctorHoursRecord(doctorId);
}
