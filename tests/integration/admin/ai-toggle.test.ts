import { describe, expect, it } from "vitest";
import { SETTING_KEYS } from "@/domain/admin/settings";

describe("ai toggle settings contract", () => {
  it("includes AI feature keys", () => {
    expect(SETTING_KEYS).toContain("ai.patientEnabled");
    expect(SETTING_KEYS).toContain("ai.doctorDocumentationEnabled");
  });
});
