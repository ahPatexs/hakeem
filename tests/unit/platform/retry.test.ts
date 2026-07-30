import { describe, expect, it, vi } from "vitest";
import { canRetry, DEFAULT_MAX_ATTEMPTS, nextDelayMs } from "@/domain/platform/retry";

describe("retry backoff", () => {
  it("increases delay upper bound with attempt number", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const d1 = nextDelayMs(1);
    const d2 = nextDelayMs(2);
    const d3 = nextDelayMs(3);
    expect(d2).toBeGreaterThanOrEqual(d1);
    expect(d3).toBeGreaterThanOrEqual(d2);
    vi.restoreAllMocks();
  });

  it("caps delay at 15 minutes", () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    expect(nextDelayMs(20)).toBeLessThanOrEqual(15 * 60 * 1_000);
    vi.restoreAllMocks();
  });

  it("allows retry until max attempts", () => {
    expect(canRetry(0, DEFAULT_MAX_ATTEMPTS)).toBe(true);
    expect(canRetry(DEFAULT_MAX_ATTEMPTS - 1, DEFAULT_MAX_ATTEMPTS)).toBe(true);
    expect(canRetry(DEFAULT_MAX_ATTEMPTS, DEFAULT_MAX_ATTEMPTS)).toBe(false);
  });
});
