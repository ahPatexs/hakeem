import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("care loop booking", () => {
  test("doctor hours editor is on the schedule page", async ({ page }) => {
    await login(page, "doctor@hakeem.local", "Doctor!Pass1234");
    await page.goto("/en/doctor/schedule");
    await expect(page.getByRole("heading", { name: /weekly hours/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /save hours/i })).toBeVisible();
  });

  test("patient sees real 30-minute slots without stub copy", async ({ page }) => {
    await login(page, "patient@hakeem.local", "Patient!Pass1234");
    await page.goto("/en/patient/doctors");
    const firstDoctor = page.locator("a[href*='/patient/doctors/']").first();
    await expect(firstDoctor).toBeVisible();
    await firstDoctor.click();
    await expect(page.getByText(/30-minute visits over the next 14 days/i)).toBeVisible();
    await expect(page.getByText(/stub availability/i)).toHaveCount(0);
  });

  test("patient upcoming includes checked-in visits", async ({ page }) => {
    await login(page, "patient@hakeem.local", "Patient!Pass1234");
    await page.goto("/en/patient/appointments/upcoming");
    await expect(page.getByRole("heading", { name: /upcoming/i })).toBeVisible();
    await expect(page.getByText(/checked in/i).first()).toBeVisible();
  });
});
