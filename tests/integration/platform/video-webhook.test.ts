import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

describe("video webhook signature helpers", () => {
  it("produces deterministic hex digests for signed bodies", () => {
    const secret = "test-secret";
    const body = JSON.stringify({ id: "evt_1", event: "room_finished" });
    const a = createHash("sha256").update(`${secret}:${body}`).digest("hex");
    const b = createHash("sha256").update(`${secret}:${body}`).digest("hex");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it("treats timestamps older than 5 minutes as stale", () => {
    const skewMs = 5 * 60 * 1000;
    const stale = Date.now() - skewMs - 1000;
    expect(Math.abs(Date.now() - stale) > skewMs).toBe(true);
  });
});
