import { describe, expect, it } from "vitest";
import { appointmentInstantSchema } from "@/lib/appointment-instant";

describe("appointmentInstantSchema", () => {
  it("accepts UTC ISO strings", () => {
    const parsed = appointmentInstantSchema.safeParse("2026-08-31T08:00:00.000Z");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.toISOString()).toBe("2026-08-31T08:00:00.000Z");
  });

  it("accepts offset ISO strings that Zod datetime() rejects", () => {
    const parsed = appointmentInstantSchema.safeParse("2026-08-31T11:00:00.000+03:00");
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.toISOString()).toBe("2026-08-31T08:00:00.000Z");
  });

  it("accepts Date objects from server-action revival", () => {
    const parsed = appointmentInstantSchema.safeParse(new Date("2026-08-31T08:00:00.000Z"));
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.toISOString()).toBe("2026-08-31T08:00:00.000Z");
  });
});