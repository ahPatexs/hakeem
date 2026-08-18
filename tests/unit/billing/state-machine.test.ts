import { describe, expect, it } from "vitest";
import {
  applyCancelledTransition,
  applyFailedTransition,
  applyPaidTransition,
  applyProcessingTransition,
  canTransition,
} from "@/domain/billing/state-machine";

describe("billing state machine", () => {
  it("allows Pending → Processing → Paid", () => {
    expect(applyProcessingTransition("PENDING")).toBe("PROCESSING");
    expect(applyPaidTransition("PROCESSING")).toBe("PAID");
  });

  it("allows Processing → Failed and Failed → Paid reconcile correction", () => {
    expect(applyFailedTransition("PROCESSING")).toBe("FAILED");
    expect(applyPaidTransition("FAILED")).toBe("PAID");
    expect(canTransition("FAILED", "PAID")).toBe(true);
  });

  it("allows Pending → Cancelled and blocks further collection", () => {
    expect(applyCancelledTransition("PENDING")).toBe("CANCELLED");
    expect(canTransition("CANCELLED", "PAID")).toBe(false);
    expect(canTransition("CANCELLED", "PROCESSING")).toBe(false);
  });

  it("does not allow Failed → Pending", () => {
    expect(canTransition("FAILED", "PENDING")).toBe(false);
  });

  it("does not allow Paid → Pending or Paid → Failed", () => {
    expect(canTransition("PAID", "PENDING")).toBe(false);
    expect(canTransition("PAID", "FAILED")).toBe(false);
  });
});
