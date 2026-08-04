import { describe, expect, it } from "vitest";
import { canPublish, canRollback, canTransition } from "@/domain/ai/prompt-lifecycle";

describe("prompt lifecycle", () => {
  it("allows publish only from DRAFT", () => {
    expect(canPublish("DRAFT")).toBe(true);
    expect(canPublish("PUBLISHED")).toBe(false);
    expect(canPublish("ARCHIVED")).toBe(false);
  });

  it("allows rollback only from ARCHIVED", () => {
    expect(canRollback("ARCHIVED")).toBe(true);
    expect(canRollback("DRAFT")).toBe(false);
    expect(canRollback("PUBLISHED")).toBe(false);
  });

  it("validates transitions", () => {
    expect(canTransition("DRAFT", "publish")).toBe(true);
    expect(canTransition("PUBLISHED", "archive")).toBe(true);
    expect(canTransition("ARCHIVED", "rollback")).toBe(true);
    expect(canTransition("PUBLISHED", "publish")).toBe(false);
    expect(canTransition("DRAFT", "rollback")).toBe(false);
  });
});
