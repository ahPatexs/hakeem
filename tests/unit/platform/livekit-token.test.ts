import { describe, expect, it } from "vitest";
import { computeJoinTokenTtlSeconds } from "@/domain/platform/video";

describe("livekit token ttl helpers", () => {
  it("never exceeds 7200 seconds", () => {
    const ttl = computeJoinTokenTtlSeconds(new Date(Date.now() + 24 * 60 * 60 * 1000));
    expect(ttl).toBeLessThanOrEqual(7200);
  });

  it("uses appointment end plus grace when shorter than 2h", () => {
    const end = new Date(Date.now() + 10 * 60 * 1000);
    const ttl = computeJoinTokenTtlSeconds(end);
    // 10m remaining + 30m grace = 40m = 2400s
    expect(ttl).toBeGreaterThanOrEqual(2300);
    expect(ttl).toBeLessThanOrEqual(2500);
  });
});
