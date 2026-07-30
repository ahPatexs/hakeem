import { test, expect } from "./fixtures";

test.describe("admin access", () => {
  test("admin shell loads for authenticated admin", async ({ adminPage }) => {
    await adminPage.goto("/en/admin");
    await expect(
      adminPage.getByRole("heading", { name: /dashboard|platform|control|لوحة/i }),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("patient is denied admin routes", async ({ patientPage }) => {
    await patientPage.goto("/en/admin");
    await expect(patientPage).not.toHaveURL(/\/admin\/?$/);
    await expect(patientPage).toHaveURL(/access-denied|unauthorized|patient/i);
  });

  test("unauthenticated admin route redirects", async ({ page }) => {
    await page.goto("/en/admin");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });
});
