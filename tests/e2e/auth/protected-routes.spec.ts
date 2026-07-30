import { test, expect } from "@playwright/test";

test.describe("auth protected routes", () => {
  test("patient area redirects unauthenticated users", async ({ page }) => {
    await page.goto("/en/patient");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });

  test("admin area redirects unauthenticated users", async ({ page }) => {
    await page.goto("/en/admin");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });

  test("session-expired page renders", async ({ page }) => {
    await page.goto("/en/session-expired");
    await expect(page.locator("body")).toContainText(/session|انتهت|expired/i);
  });

  test("access-denied page renders", async ({ page }) => {
    await page.goto("/en/access-denied");
    await expect(page.locator("body")).toContainText(/access|denied|غير مصرح|صلاحية/i);
  });
});
