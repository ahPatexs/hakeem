/**
 * Lightweight ops dashboard aggregate perf smoke (T075).
 * Uses synthetic samples — does not require 100k DB rows.
 */
import { describe, expect, it } from "vitest";
import { percentileNearest } from "@/lib/ai/ops";

function aggregateSynthetic(n: number) {
  const byFeature = new Map<string, number>();
  const latencies: number[] = [];
  let cost = 0;
  let errors = 0;

  for (let i = 0; i < n; i++) {
    const feature = ["PATIENT_ASSISTANT", "DOCTOR_SOAP", "RX_ASSIST", "CDS"][i % 4]!;
    byFeature.set(feature, (byFeature.get(feature) ?? 0) + 1);
    latencies.push(50 + (i % 200));
    cost += 0.001 * (i % 10);
    if (i % 37 === 0) errors += 1;
  }

  latencies.sort((a, b) => a - b);
  return {
    total: n,
    byFeature: Object.fromEntries(byFeature),
    p50: percentileNearest(latencies, 50),
    p95: percentileNearest(latencies, 95),
    cost,
    errorRate: errors / n,
  };
}

describe("ai ops perf smoke", () => {
  it("aggregates 10k synthetic usage events under 2s", () => {
    const start = performance.now();
    const result = aggregateSynthetic(10_000);
    const elapsed = performance.now() - start;

    expect(result.total).toBe(10_000);
    expect(result.p50).toBeGreaterThan(0);
    expect(result.p95).toBeGreaterThanOrEqual(result.p50);
    expect(elapsed).toBeLessThan(2000);
  });

  it("scales to 100k synthetic events under 2s on modern hardware", () => {
    const start = performance.now();
    const result = aggregateSynthetic(100_000);
    const elapsed = performance.now() - start;

    expect(result.total).toBe(100_000);
    expect(Object.keys(result.byFeature).length).toBe(4);
    expect(elapsed).toBeLessThan(2000);
  });
});
