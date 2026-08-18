import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("billing checkout", () => {
  test.skip(
    process.env.CI === "true" && process.env.E2E_BILLING !== "1",
    "Set E2E_BILLING=1 to run billing e2e in CI",
  );

  test("patient payments page lists demo obligations", async ({ page }) => {
    await login(page, "patient@hakeem.local", "Patient!Pass1234");
    await page.goto("/en/patient/payments");
    await expect(page.getByRole("heading", { name: /payments/i })).toBeVisible({ timeout: 20_000 });
  });

  test("unpaid video join copy is available on payments copy", async ({ page }) => {
    await login(page, "patient@hakeem.local", "Patient!Pass1234");
    await page.goto("/en/patient/payments");
    await expect(page.getByText(/demo payment|card details are never entered/i)).toBeVisible();
  });
});
