import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import ar from "@/i18n/messages/ar.json";

type Messages = typeof en;

function getEmr(messages: Messages) {
  return (messages as unknown as { emr: Record<string, unknown> }).emr;
}

describe("emr i18n keys (en/ar parity)", () => {
  it("defines the emr namespace in both locales", () => {
    expect(getEmr(en)).toBeTruthy();
    expect(getEmr(ar)).toBeTruthy();
  });

  it("defines summary keys used by the summary widget", () => {
    for (const messages of [en, ar]) {
      const emr = getEmr(messages) as { summary: Record<string, string> };
      expect(emr.summary.title).toBeTruthy();
      expect(emr.summary.allergies).toBeTruthy();
      expect(emr.summary.medications).toBeTruthy();
      expect(emr.summary.empty).toBeTruthy();
    }
  });

  it("defines timeline keys used by MedicalTimeline", () => {
    for (const messages of [en, ar]) {
      const emr = getEmr(messages) as { timeline: Record<string, string> };
      expect(emr.timeline.title).toBeTruthy();
      expect(emr.timeline.empty).toBeTruthy();
      expect(emr.timeline.filterAll).toBeTruthy();
      expect(emr.timeline.filterType).toBeTruthy();
    }
  });

  it("defines criticalAlerts keys used by CriticalAlerts", () => {
    for (const messages of [en, ar]) {
      const emr = getEmr(messages) as { criticalAlerts: Record<string, string> };
      expect(emr.criticalAlerts.title).toBeTruthy();
      expect(emr.criticalAlerts.empty).toBeTruthy();
    }
  });

  it("defines consent keys for acknowledge/withdraw UI", () => {
    for (const messages of [en, ar]) {
      const emr = getEmr(messages) as { consent: Record<string, string> };
      expect(emr.consent.title).toBeTruthy();
      expect(emr.consent.acknowledge).toBeTruthy();
      expect(emr.consent.withdraw).toBeTruthy();
      expect(emr.consent.acknowledged).toBeTruthy();
      expect(emr.consent.withdrawn).toBeTruthy();
      expect(emr.consent.none).toBeTruthy();
    }
  });

  it("keeps en and ar emr key sets in sync", () => {
    function keys(obj: unknown, prefix = ""): string[] {
      if (typeof obj !== "object" || obj === null) return [prefix];
      return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
        keys(value, prefix ? `${prefix}.${key}` : key),
      );
    }

    const enKeys = keys(getEmr(en)).sort();
    const arKeys = keys(getEmr(ar)).sort();
    expect(arKeys).toEqual(enKeys);
  });
});
