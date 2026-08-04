/**
 * Integration-shaped checks for the SOAP note lifecycle without a live DB:
 * composes the finalize/hash/late-amendment domain rules with the generic
 * EMR versioning helpers the way `saveSoapDraft` / `signSoapNote` /
 * `amendSoapNote` do internally.
 */
import { describe, expect, it } from "vitest";
import {
  assertSoapFinalizable,
  hashSoapContent,
  isLateAmendment,
  LATE_AMENDMENT_MS,
} from "@/domain/doctor/soap";
import { canAmendSigned, checkSoftConcurrency, requireAmendmentReason } from "@/domain/emr/versioning";
import { getSoapNote, saveSoapDraft, signSoapNote, amendSoapNote } from "@/lib/emr/notes";

describe("emr notes facade wiring", () => {
  it("exports the full SOAP note surface", () => {
    for (const fn of [getSoapNote, saveSoapDraft, signSoapNote, amendSoapNote]) {
      expect(typeof fn).toBe("function");
    }
  });
});

describe("SOAP sign → amend versioning composition", () => {
  const content = {
    subjective: "Cough for 3 days",
    objective: "Afebrile, lungs clear",
    assessment: "Viral URI",
    plan: "Supportive care",
  };

  it("cannot sign without assessment and plan", () => {
    expect(() =>
      assertSoapFinalizable({ ...content, assessment: "", plan: "" }),
    ).toThrow();
    expect(() => assertSoapFinalizable(content)).not.toThrow();
  });

  it("signing requires the client's version to match the persisted version (optimistic concurrency)", () => {
    const ok = checkSoftConcurrency(2, 2);
    expect(ok.ok).toBe(true);

    const stale = checkSoftConcurrency(1, 2);
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.code).toBe("CONFLICT");
  });

  it("a signed note becomes amendable and produces a stable content hash", () => {
    const signedAt = new Date("2024-01-01T00:00:00.000Z");
    expect(canAmendSigned(signedAt, new Date("2024-01-02T00:00:00.000Z"))).toBe(true);

    const hashA = hashSoapContent(content);
    const hashB = hashSoapContent(content);
    expect(hashA).toBe(hashB);

    const hashDifferentPlan = hashSoapContent({ ...content, plan: "Different plan" });
    expect(hashDifferentPlan).not.toBe(hashA);
  });

  it("amending a signed note requires a non-empty reason", () => {
    const missing = requireAmendmentReason(undefined);
    expect(missing.ok).toBe(false);

    const provided = requireAmendmentReason("Corrected assessment after follow-up");
    expect(provided.ok).toBe(true);
  });

  it("flags amendments made after the late-amendment window", () => {
    const signedAt = new Date("2024-01-01T00:00:00.000Z");
    const withinWindow = new Date(signedAt.getTime() + LATE_AMENDMENT_MS - 1000);
    const afterWindow = new Date(signedAt.getTime() + LATE_AMENDMENT_MS + 1000);

    expect(isLateAmendment(signedAt, withinWindow)).toBe(false);
    expect(isLateAmendment(signedAt, afterWindow)).toBe(true);
  });
});
