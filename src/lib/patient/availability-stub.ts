/**
 * Stub availability when no real schedule table exists.
 * Generates hourly slots 09:00–17:00 for the next 7 days (local time).
 */
export interface AvailabilitySlot {
  startAt: string;
  endAt: string;
}

const SLOT_MS = 60 * 60 * 1000;
const DAY_START_HOUR = 9;
const DAY_END_HOUR = 17;
const DAYS_AHEAD = 7;

export function generateStubAvailability(from: Date = new Date()): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  for (let day = 0; day < DAYS_AHEAD; day++) {
    const dayBase = new Date(cursor);
    dayBase.setDate(cursor.getDate() + day);

    for (let hour = DAY_START_HOUR; hour < DAY_END_HOUR; hour++) {
      const start = new Date(dayBase);
      start.setHours(hour, 0, 0, 0);
      if (start.getTime() <= from.getTime()) continue;

      const end = new Date(start.getTime() + SLOT_MS);
      slots.push({
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      });
    }
  }

  return slots;
}
