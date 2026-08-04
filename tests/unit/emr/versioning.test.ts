import { describe, expect, it } from "vitest";
import {
  canAmendSigned,
  checkSoftConcurrency,
  requireAmendmentReason,
} from "@/domain/emr/versioning";

describe("EMR versioning helpers", () => {
  it("canAmendSigned requires a past-or-present signedAt", () => {
    expect(canAmendSigned(null)).toBe(false);
    expect(canAmendSigned(new Date("2099-01-01"), new Date("2020-01-01"))).toBe(false);
    expect(canAmendSigned(new Date("2020-01-01"), new Date("2020-01-02"))).toBe(true);
  });

  it("requireAmendmentReason rejects empty reason", () => {
    const empty = requireAmendmentReason("  ");
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.code).toBe("VALIDATION_ERROR");

    const ok = requireAmendmentReason("Corrected dosage");
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.data.reason).toBe("Corrected dosage");
  });

  it("checkSoftConcurrency detects version mismatch", () => {
    expect(checkSoftConcurrency(1, 1).ok).toBe(true);
    const conflict = checkSoftConcurrency(1, 2);
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.code).toBe("CONFLICT");
  });
});
