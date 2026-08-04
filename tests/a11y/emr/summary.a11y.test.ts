import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("emr a11y summary chrome", () => {
  it("critical alerts expose an accessible region name", () => {
    const source = readFileSync(
      resolve("src/components/emr/critical-alerts.tsx"),
      "utf8",
    );
    expect(source).toMatch(/role=["'](?:alert|region|status)["']/);
    expect(source).toMatch(/aria-label|aria-labelledby/);
  });
});

describe("emr a11y timeline filters", () => {
  it("filter control has an sr-only label", () => {
    const source = readFileSync(
      resolve("src/components/emr/timeline/medical-timeline.tsx"),
      "utf8",
    );
    expect(source).toMatch(/sr-only/);
    expect(source).toMatch(/filterType/);
  });
});
