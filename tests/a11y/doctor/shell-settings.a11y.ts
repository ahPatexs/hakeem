import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import ar from "@/i18n/messages/ar.json";

const DOCTOR_NAV_KEYS = [
  "dashboard",
  "schedule",
  "queue",
  "patients",
  "prescriptions",
  "labs",
  "ai",
  "notifications",
  "profile",
  "settings",
] as const;

describe("doctor shell a11y i18n", () => {
  it("defines nav labels in English and Arabic", () => {
    for (const key of DOCTOR_NAV_KEYS) {
      expect(en.doctor.nav[key]).toBeTruthy();
      expect(ar.doctor.nav[key]).toBeTruthy();
    }
  });

  it("defines shell accessibility strings", () => {
    expect(en.doctor.shell.openMenu).toBeTruthy();
    expect(en.doctor.shell.notifications).toBeTruthy();
    expect(ar.doctor.shell.openMenu).toBeTruthy();
    expect(ar.doctor.shell.notifications).toBeTruthy();
  });
});
