import { test, expect } from "@playwright/test";

test.describe("platform smoke", () => {
  test.skip(
    process.env.CI === "true" && process.env.E2E_PLATFORM_SMOKE !== "1",
    "Set E2E_PLATFORM_SMOKE=1 to run platform smoke in CI",
  );

  test("unauthenticated patient route redirects to login", async ({ page }) => {
    await page.goto("/en/patient");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });

  test("public doctors page loads without auth", async ({ page }) => {
    await page.goto("/en/doctors");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  });
});
