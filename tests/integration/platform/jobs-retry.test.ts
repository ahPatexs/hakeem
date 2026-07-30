import { describe, expect, it } from "vitest";
import { canRetry, DEFAULT_MAX_ATTEMPTS } from "@/domain/platform/retry";
import { BACKGROUND_JOB_TYPES } from "@/domain/platform/jobs";

describe("background job retry contract", () => {
  it("failJob dead-letters after max attempts", () => {
    const atMax = DEFAULT_MAX_ATTEMPTS;
    expect(canRetry(atMax - 1, atMax)).toBe(true);
    expect(canRetry(atMax, atMax)).toBe(false);
  });

  it("covers outbound and webhook side-effect job types", () => {
    expect(BACKGROUND_JOB_TYPES).toContain("OUTBOUND_EMAIL");
    expect(BACKGROUND_JOB_TYPES).toContain("WEBHOOK_SIDE_EFFECT");
    expect(BACKGROUND_JOB_TYPES).toContain("MALWARE_SCAN");
  });
});
