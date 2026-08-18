import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import ar from "@/i18n/messages/ar.json";

function keys(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    keys(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("billing i18n keys (en/ar parity)", () => {
  it("keeps patient.payments keys in sync", () => {
    expect(keys(en.patient.payments).sort()).toEqual(keys(ar.patient.payments).sort());
    expect(en.patient.payments.checkoutTitle).toBeTruthy();
    expect(ar.patient.payments.checkoutTitle).toBeTruthy();
  });

  it("keeps doctor.earnings and doctor.nav.earnings in sync", () => {
    expect(en.doctor.nav.earnings).toBeTruthy();
    expect(ar.doctor.nav.earnings).toBeTruthy();
    expect(keys(en.doctor.earnings).sort()).toEqual(keys(ar.doctor.earnings).sort());
  });

  it("keeps admin.billing keys in sync", () => {
    expect(keys(en.admin.billing).sort()).toEqual(keys(ar.admin.billing).sort());
    expect(en.admin.billing.filterStuck).toBeTruthy();
    expect(ar.admin.billing.filterStuck).toBeTruthy();
  });
});
