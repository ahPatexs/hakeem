import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Accessibility contract for patient AI chat surfaces (T077).
 */
describe("ai chat a11y", () => {
  const root = path.resolve(__dirname, "../../../src/components/ai");

  it("assistant chat exposes live region for streaming messages", () => {
    const source = readFileSync(path.join(root, "chat/assistant-chat.tsx"), "utf8");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("aria-relevant");
    expect(source).toContain('aria-label={t("suggestedLabel")}');
    expect(source).toContain('aria-label={t("inputPlaceholder")}');
  });

  it("emergency banner / notices use assertive live regions", () => {
    const bubble = readFileSync(path.join(root, "chat/message-bubble.tsx"), "utf8");
    expect(bubble).toContain('aria-live={isNotice ? "assertive"');
    const banner = readFileSync(path.join(root, "chat/emergency-banner.tsx"), "utf8");
    expect(banner).toMatch(/role=["']alert["']/);
  });

  it("consent notice is a polite status region with manage link", () => {
    const source = readFileSync(path.join(root, "chat/consent-notice.tsx"), "utf8");
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain("/patient/medical-profile");
  });

  it("response feedback controls are labeled for keyboard/AT", () => {
    const source = readFileSync(path.join(root, "feedback/response-feedback.tsx"), "utf8");
    expect(source).toContain('role="group"');
    expect(source).toContain("aria-label={t(");
    expect(source).toContain("aria-pressed");
  });
});
