import { test, expect } from "@playwright/test";

test.describe("patient portal smoke", () => {
  test("patient area redirects when unauthenticated", async ({ page }) => {
    await page.goto("/en/patient");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });

  test("doctors search page requires auth", async ({ page }) => {
    await page.goto("/en/patient/doctors");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });
});
