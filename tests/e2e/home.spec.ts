import { test, expect } from "@playwright/test";

test.describe("Home smoke", () => {
  for (const locale of ["en", "ar"] as const) {
    test(`loads ${locale} home with hero and CTAs`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
      if (locale === "ar") {
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      } else {
        await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
      }
    });
  }
});
