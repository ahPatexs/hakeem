import { describe, expect, it } from "vitest";
import { isPushEnabled } from "@/domain/platform/flags";

describe("push skip when disabled", () => {
  it("isPushEnabled is false when PLATFORM_PUSH_ENABLED is not true", () => {
    const prev = process.env.PLATFORM_PUSH_ENABLED;
    const prevLegacy = process.env.PUSH_ENABLED;
    process.env.PLATFORM_PUSH_ENABLED = "false";
    process.env.PUSH_ENABLED = "false";
    expect(isPushEnabled()).toBe(false);
    process.env.PLATFORM_PUSH_ENABLED = prev;
    process.env.PUSH_ENABLED = prevLegacy;
  });

  it("sendPush returns DEPENDENCY_UNAVAILABLE before touching providers", async () => {
    const prev = process.env.PLATFORM_PUSH_ENABLED;
    const prevLegacy = process.env.PUSH_ENABLED;
    process.env.PLATFORM_PUSH_ENABLED = "false";
    process.env.PUSH_ENABLED = "false";
    const { sendPush } = await import("@/lib/platform/push");
    const result = await sendPush({
      userId: "user-1",
      title: "Test",
      body: "Body",
      idempotencyKey: `push:test:${Date.now()}`,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("DEPENDENCY_UNAVAILABLE");
    }
    process.env.PLATFORM_PUSH_ENABLED = prev;
    process.env.PUSH_ENABLED = prevLegacy;
  });
});
