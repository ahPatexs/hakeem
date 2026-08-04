import { describe, expect, it } from "vitest";
import { sortTimelineEvents } from "@/domain/emr/timeline";

describe("emr timeline perf smoke", () => {
  it("sorts 500 synthetic events under 100ms", () => {
    const now = Date.now();
    const events = Array.from({ length: 500 }, (_, i) => ({
      id: `e${i}`,
      effectiveAt: new Date(now - i * 60_000),
      type: "LAB" as const,
      visibility: "ALL_AUTHORIZED" as const,
      status: "ACTIVE" as const,
    }));

    const start = performance.now();
    const sorted = sortTimelineEvents(events);
    const elapsed = performance.now() - start;

    expect(sorted).toHaveLength(500);
    expect(elapsed).toBeLessThan(100);
  });
});
