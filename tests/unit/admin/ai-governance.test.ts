import { describe, expect, it } from "vitest";
import { aiFailClosed } from "@/domain/admin/ai-governance";

describe("ai governance fail-closed", () => {
  it("blocks when disabled", () => {
    expect(aiFailClosed(false)).toBe(false);
    expect(aiFailClosed(true)).toBe(true);
  });
});
