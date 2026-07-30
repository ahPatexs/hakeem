import { describe, expect, it } from "vitest";

describe("export row cap", () => {
  it("defaults to 10000", () => {
    expect(Number(process.env.ADMIN_EXPORT_ROW_CAP ?? 10_000)).toBe(10_000);
  });
});
