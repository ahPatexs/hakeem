import { describe, expect, it } from "vitest";
import { latestConsentState, type ConsentEventLike } from "@/domain/emr/consent";

describe("latestConsentState (append-only consent, FR-045)", () => {
  it("returns NONE when there is no event for the type", () => {
    expect(latestConsentState([], "TELEHEALTH")).toBe("NONE");
  });

  it("returns ACKNOWLEDGED after an acknowledge event", () => {
    const events: ConsentEventLike[] = [
      { typeCode: "TELEHEALTH", kind: "ACKNOWLEDGE", at: "2024-01-01T00:00:00.000Z" },
    ];
    expect(latestConsentState(events, "TELEHEALTH")).toBe("ACKNOWLEDGED");
  });

  it("returns WITHDRAWN after a withdraw event", () => {
    const events: ConsentEventLike[] = [
      { typeCode: "TELEHEALTH", kind: "ACKNOWLEDGE", at: "2024-01-01T00:00:00.000Z" },
      { typeCode: "TELEHEALTH", kind: "WITHDRAW", at: "2024-02-01T00:00:00.000Z" },
    ];
    expect(latestConsentState(events, "TELEHEALTH")).toBe("WITHDRAWN");
  });

  it("does not erase prior ACKNOWLEDGE events; state reflects only the latest by time", () => {
    const events: ConsentEventLike[] = [
      { typeCode: "TELEHEALTH", kind: "WITHDRAW", at: "2024-01-01T00:00:00.000Z" },
      { typeCode: "TELEHEALTH", kind: "ACKNOWLEDGE", at: "2024-03-01T00:00:00.000Z" },
    ];
    // Re-consent after withdrawal: latest event wins, but both remain in the log
    // (the caller is expected to persist all events; this only derives current state).
    expect(latestConsentState(events, "TELEHEALTH")).toBe("ACKNOWLEDGED");
    expect(events).toHaveLength(2);
  });

  it("ignores events for other consent types", () => {
    const events: ConsentEventLike[] = [
      { typeCode: "MARKETING", kind: "ACKNOWLEDGE", at: "2024-01-01T00:00:00.000Z" },
    ];
    expect(latestConsentState(events, "TELEHEALTH")).toBe("NONE");
  });

  it("uses actual chronological order regardless of array order", () => {
    const events: ConsentEventLike[] = [
      { typeCode: "TELEHEALTH", kind: "ACKNOWLEDGE", at: "2024-05-01T00:00:00.000Z" },
      { typeCode: "TELEHEALTH", kind: "WITHDRAW", at: "2024-01-01T00:00:00.000Z" },
    ];
    expect(latestConsentState(events, "TELEHEALTH")).toBe("ACKNOWLEDGED");
  });

  it("accepts Date objects as well as ISO strings", () => {
    const events: ConsentEventLike[] = [
      { typeCode: "TELEHEALTH", kind: "ACKNOWLEDGE", at: new Date("2024-01-01T00:00:00.000Z") },
    ];
    expect(latestConsentState(events, "TELEHEALTH")).toBe("ACKNOWLEDGED");
  });
});

describe("assertConsentRequired (fail-closed gate, T145)", () => {
  it("allows ACKNOWLEDGED", async () => {
    const { assertConsentRequired } = await import("@/domain/emr/consent");
    const events: ConsentEventLike[] = [
      { typeCode: "TELEHEALTH", kind: "ACKNOWLEDGE", at: "2024-01-01T00:00:00.000Z" },
    ];
    expect(assertConsentRequired(events, "TELEHEALTH")).toEqual({ ok: true });
  });

  it("blocks NONE and WITHDRAWN", async () => {
    const { assertConsentRequired } = await import("@/domain/emr/consent");
    expect(assertConsentRequired([], "TELEHEALTH")).toEqual({ ok: false, state: "NONE" });
    const withdrawn: ConsentEventLike[] = [
      { typeCode: "TELEHEALTH", kind: "ACKNOWLEDGE", at: "2024-01-01T00:00:00.000Z" },
      { typeCode: "TELEHEALTH", kind: "WITHDRAW", at: "2024-02-01T00:00:00.000Z" },
    ];
    expect(assertConsentRequired(withdrawn, "TELEHEALTH")).toEqual({
      ok: false,
      state: "WITHDRAWN",
    });
  });
});
