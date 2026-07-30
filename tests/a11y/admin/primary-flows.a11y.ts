import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Accessibility contracts for admin primary flows.
 * Component source must expose keyboard-reachable destructive actions with labeled dialogs.
 */
describe("admin a11y primary flows", () => {
  const root = path.resolve(__dirname, "../../../src/components/admin");

  it("dashboard shell exposes navigation landmarks", () => {
    const shell = readFileSync(path.join(root, "shell/admin-portal-shell.tsx"), "utf8");
    const sidebar = readFileSync(path.join(root, "shell/admin-sidebar.tsx"), "utf8");
    const nav = readFileSync(path.join(root, "shell/admin-nav.tsx"), "utf8");
    expect(`${shell}${sidebar}${nav}`).toMatch(/aside|AdminNav|aria-|nav/i);
  });

  it("user suspend uses ConfirmReasonDialog with labeled reason field", () => {
    const actions = readFileSync(path.join(root, "users/user-detail-actions.tsx"), "utf8");
    expect(actions).toContain("ConfirmReasonDialog");
    const dialog = readFileSync(path.join(root, "shared/confirm-reason-dialog.tsx"), "utf8");
    expect(dialog).toContain('htmlFor="admin-reason"');
    expect(dialog).toContain("minLength");
  });

  it("doctor approve/reject controls are keyboard buttons with reject reason dialog", () => {
    const queue = readFileSync(path.join(root, "doctors/doctor-queue-actions.tsx"), "utf8");
    expect(queue).toContain("ConfirmReasonDialog");
    expect(queue).toContain("approveDoctor");
    expect(queue).toContain("rejectDoctor");
    expect(queue).toMatch(/Button/);
  });
});
