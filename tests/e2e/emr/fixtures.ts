import { test as base, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@hakeem.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin!Pass1234";
const PATIENT_EMAIL = process.env.E2E_PATIENT_EMAIL ?? "patient@hakeem.local";
const PATIENT_PASSWORD = process.env.E2E_PATIENT_PASSWORD ?? "Patient!Pass1234";
const DOCTOR_EMAIL = process.env.E2E_DOCTOR_EMAIL ?? "doctor@hakeem.local";
const DOCTOR_PASSWORD = process.env.E2E_DOCTOR_PASSWORD ?? "Doctor!Pass1234";

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in|تسجيل/i }).click();
  await page.waitForURL(/\/(en|ar)\/(admin|patient|doctor)/, { timeout: 30_000 });
}

export const test = base.extend<{ adminPage: Page; patientPage: Page; doctorPage: Page }>({
  adminPage: async ({ page }, use) => {
    test.skip(!process.env.E2E_ADMIN_EMAIL, "Set E2E_ADMIN_EMAIL to run authenticated EMR admin flows");
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await use(page);
  },
  patientPage: async ({ page }, use) => {
    test.skip(!process.env.E2E_PATIENT_EMAIL, "Set E2E_PATIENT_EMAIL to run authenticated EMR patient flows");
    await loginAs(page, PATIENT_EMAIL, PATIENT_PASSWORD);
    await use(page);
  },
  doctorPage: async ({ page }, use) => {
    test.skip(!process.env.E2E_DOCTOR_EMAIL, "Set E2E_DOCTOR_EMAIL to run authenticated EMR doctor flows");
    await loginAs(page, DOCTOR_EMAIL, DOCTOR_PASSWORD);
    await use(page);
  },
});

export { expect };
