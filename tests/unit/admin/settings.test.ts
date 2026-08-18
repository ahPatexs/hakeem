import { describe, expect, it } from "vitest";
import { parseSettingValue, SETTING_KEYS } from "@/domain/admin/settings";
import { AdminDomainError } from "@/domain/admin/errors";

describe("platform settings validation", () => {
  it("accepts boolean true/false", () => {
    expect(parseSettingValue("BOOLEAN", "true")).toBe("true");
    expect(parseSettingValue("BOOLEAN", "false")).toBe("false");
  });

  it("rejects invalid boolean and empty string", () => {
    expect(() => parseSettingValue("BOOLEAN", "yes")).toThrow(AdminDomainError);
    expect(() => parseSettingValue("STRING", "   ")).toThrow(AdminDomainError);
  });

  it("validates JSON", () => {
    expect(parseSettingValue("JSON", "{\"a\":1}")).toContain("a");
    expect(() => parseSettingValue("JSON", "{bad")).toThrow(AdminDomainError);
  });

  it("lists known setting keys", () => {
    expect(SETTING_KEYS).toContain("maintenanceMode");
    expect(SETTING_KEYS).toContain("ai.patientEnabled");
    expect(SETTING_KEYS).toContain("billing.consultationFeeCents");
  });
});
