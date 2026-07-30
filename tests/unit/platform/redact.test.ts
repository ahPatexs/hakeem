import { describe, expect, it } from "vitest";
import { redactErrorMessage, redactSecrets } from "@/lib/platform/redact";

describe("redactSecrets", () => {
  it("redacts secret-like object keys", () => {
    expect(
      redactSecrets({
        password: "hunter2",
        apiKey: "sk_live_abc",
        nested: { token: "abc", safe: "ok" },
      }),
    ).toEqual({
      password: "[REDACTED]",
      apiKey: "[REDACTED]",
      nested: { token: "[REDACTED]", safe: "ok" },
    });
  });

  it("redacts bearer tokens in strings", () => {
    expect(redactSecrets("Authorization: Bearer abc.def.ghi")).toContain("[REDACTED]");
  });
});

describe("redactErrorMessage", () => {
  it("redacts secret patterns and truncates", () => {
    const msg = redactErrorMessage(new Error("failed Bearer tokensecret123 sk_live_xyz"));
    expect(msg).toContain("[REDACTED]");
    expect(msg.length).toBeLessThanOrEqual(500);
  });
});
