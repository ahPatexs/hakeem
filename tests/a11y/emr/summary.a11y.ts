import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Accessibility contract for the EMR summary widget's critical alerts region.
 * Component source must expose an accessible name via role + aria-label,
 * and a calm status cue when there is nothing to report.
 */
describe("emr summary a11y", () => {
  const root = path.resolve(__dirname, "../../../src/components/emr");

  it("CriticalAlerts exposes an accessible alert region with a labeled name", () => {
    const source = readFileSync(path.join(root, "critical-alerts.tsx"), "utf8");
    expect(source).toContain('role="alert"');
    expect(source).toContain("aria-label={title}");
  });

  it("CriticalAlerts falls back to an accessible status region when empty", () => {
    const source = readFileSync(path.join(root, "critical-alerts.tsx"), "utf8");
    expect(source).toContain('role="status"');
  });

  it("decorative icons are hidden from assistive tech", () => {
    const source = readFileSync(path.join(root, "critical-alerts.tsx"), "utf8");
    expect(source).toMatch(/aria-hidden/);
  });
});
