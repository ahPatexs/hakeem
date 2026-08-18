import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("billing refunds", () => {
  test.skip(
    process.env.CI === "true" && process.env.E2E_BILLING !== "1",
    "Set E2E_BILLING=1 to run billing e2e in CI",
  );

  test("admin billing page shows refund queue heading or transactions", async ({ page }) => {
    await login(page, "admin@hakeem.local", "Admin!Pass1234");
    await page.goto("/en/admin/billing");
    await expect(page.getByRole("heading", { name: /billing/i })).toBeVisible({ timeout: 20_000 });
  });
});
