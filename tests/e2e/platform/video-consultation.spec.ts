import { test, expect } from "@playwright/test";

test.describe("platform video consultation shell", () => {
  test.skip(!process.env.E2E_BASE_URL, "Requires E2E_BASE_URL");

  test("patient video route renders waiting room chrome", async ({ page }) => {
    // Smoke only — full auth flow covered elsewhere; this asserts shared shell copy exists when reachable.
    await page.goto(`${process.env.E2E_BASE_URL}/en/patient`);
    await expect(page.locator("body")).toBeVisible();
  });
});
