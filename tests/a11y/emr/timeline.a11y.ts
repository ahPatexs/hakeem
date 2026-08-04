import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Accessibility contract for the medical timeline's type filter: the visible
 * control must have a screen-reader-only label rather than relying on
 * placeholder text or an unlabeled select.
 */
describe("emr timeline a11y", () => {
  const root = path.resolve(__dirname, "../../../src/components/emr/timeline");

  it("the type filter select has an sr-only label", () => {
    const source = readFileSync(path.join(root, "medical-timeline.tsx"), "utf8");
    expect(source).toContain("sr-only");
    expect(source).toContain('t("timeline.filterType")');
  });

  it("the filter label wraps a native <select> for keyboard/AT support", () => {
    const source = readFileSync(path.join(root, "medical-timeline.tsx"), "utf8");
    expect(source).toMatch(/<label[^>]*>[\s\S]*<select/);
  });
});
