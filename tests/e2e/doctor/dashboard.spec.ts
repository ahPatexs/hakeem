import { test, expect } from "@playwright/test";

/**
 * Doctor dashboard smoke — requires seeded doctor session in CI.
 * Skipped until auth fixture for doctor role is wired in e2e harness.
 */
test.describe("doctor dashboard", () => {
  test.skip("loads dashboard shell for authenticated doctor", async ({ page }) => {
    await page.goto("/en/doctor");
    await expect(page.getByRole("heading", { name: /dashboard|welcome/i })).toBeVisible();
  });
});
