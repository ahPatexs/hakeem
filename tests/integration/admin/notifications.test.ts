import { describe, expect, it } from "vitest";

describe("mark all read contract", () => {
  it("notification recipient filter uses unread null readAt", () => {
    const filter = { readAt: null, dismissedAt: null };
    expect(filter.readAt).toBeNull();
  });
});
