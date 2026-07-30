import { test as base, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@hakeem.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin!Pass1234";
const PATIENT_EMAIL = process.env.E2E_PATIENT_EMAIL ?? "patient@hakeem.local";
const PATIENT_PASSWORD = process.env.E2E_PATIENT_PASSWORD ?? "Patient!Pass1234";

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in|تسجيل/i }).click();
  await page.waitForURL(/\/(en|ar)\/(admin|patient|doctor)/, { timeout: 30_000 });
}

export const test = base.extend<{ adminPage: Page; patientPage: Page }>({
  adminPage: async ({ page }, use) => {
    test.skip(
      process.env.CI === "true" && process.env.E2E_ADMIN_AUTH !== "1",
      "Set E2E_ADMIN_AUTH=1 with seeded admin for CI",
    );
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await use(page);
  },
  patientPage: async ({ page }, use) => {
    test.skip(
      process.env.CI === "true" && process.env.E2E_ADMIN_AUTH !== "1",
      "Set E2E_ADMIN_AUTH=1 with seeded patient for CI",
    );
    await loginAs(page, PATIENT_EMAIL, PATIENT_PASSWORD);
    await use(page);
  },
});

export { expect };
