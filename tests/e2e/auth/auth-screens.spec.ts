import { test, expect } from "@playwright/test";

test.describe("auth screens", () => {
  for (const locale of ["ar", "en"] as const) {
    test(`login page renders (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}/login`);
      await expect(page.getByRole("button", { name: /sign in|تسجيل الدخول/i })).toBeVisible();
    });

    test(`register page renders (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}/register`);
      await expect(page.getByRole("button", { name: /create account|إنشاء الحساب/i })).toBeVisible();
    });
  }
});
