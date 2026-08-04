import { describe, expect, it } from "vitest";
import { canTransitionVideoSession } from "@/domain/platform/video";

describe("video session transitions", () => {
  it("blocks illegal backward transitions", () => {
    expect(canTransitionVideoSession("IN_CALL", "WAITING")).toBe(false);
    expect(canTransitionVideoSession("ENDED", "SCHEDULED")).toBe(false);
    expect(canTransitionVideoSession("CANCELLED", "IN_CALL")).toBe(false);
  });
});
