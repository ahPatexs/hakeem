import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Accessibility contract for AI admin ops surfaces (T077).
 */
describe("ai admin a11y", () => {
  const root = path.resolve(__dirname, "../../../src/components/ai/admin");

  it("ops dashboard budget breach uses alert role", () => {
    const source = readFileSync(path.join(root, "ops-dashboard.tsx"), "utf8");
    expect(source).toContain('role="alert"');
  });

  it("admin subnav exposes a navigation label", () => {
    const source = readFileSync(path.join(root, "ai-admin-subnav.tsx"), "utf8");
    expect(source).toMatch(/aria-label|role=["']navigation["']/);
  });

  it("guardrail log notes absence of message content", () => {
    const source = readFileSync(path.join(root, "guardrail-log.tsx"), "utf8");
    expect(source.toLowerCase()).toMatch(/no.?content|message content|metadata/);
  });
});
