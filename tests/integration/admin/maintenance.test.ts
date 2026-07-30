import { describe, expect, it } from "vitest";
import { SETTING_KEYS } from "@/domain/admin/settings";

describe("maintenance gate contract", () => {
  it("includes maintenanceMode setting key", () => {
    expect(SETTING_KEYS).toContain("maintenanceMode");
    expect(SETTING_KEYS).toContain("maintenanceMessage");
  });
});
