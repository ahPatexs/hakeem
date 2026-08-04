import { describe, expect, it } from "vitest";
import { computeJoinTokenTtlSeconds } from "@/domain/platform/video";

describe("video token perf smoke", () => {
  it("computes ttl for 1000 appointments under 50ms", () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      computeJoinTokenTtlSeconds(new Date(Date.now() + i * 1000));
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});
