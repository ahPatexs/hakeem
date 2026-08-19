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

  test("patient can book a later open slot with Alaa Helal", async ({ page }) => {
    test.skip(!process.env.PLAYWRIGHT_LIVE, "Set PLAYWRIGHT_LIVE=1 to book against the target URL");
    test.setTimeout(120_000);
    const email = process.env.PLAYWRIGHT_PATIENT_EMAIL ?? "ahelal@patexs.com";
    const password = process.env.PLAYWRIGHT_PATIENT_PASSWORD ?? "Patexs!Pass1234";
    await login(page, email, password);
    await expect(page).not.toHaveURL(/\/login/i, { timeout: 30_000 });
    await page.goto("/en/patient/doctors/alaa-helal");
    await expect(page.getByRole("heading", { name: /alaa helal/i })).toBeVisible({ timeout: 30_000 });

    const openSlot = page
      .locator("aside button:not([disabled])")
      .filter({ hasNotText: /book this time|video|in[- ]person/i })
      .last();
    await expect(openSlot).toBeVisible({ timeout: 30_000 });
    await openSlot.click();

    await page.getByRole("button", { name: /book this time/i }).click();
    try {
      await expect(page).toHaveURL(/\/patient\/appointments\/[^/]+/i, { timeout: 60_000 });
    } catch (error) {
      const alert = page.getByRole("alert");
      const message = (await alert.isVisible()) ? await alert.innerText() : page.url();
      throw new Error(`Booking did not complete: ${message}`, { cause: error });
    }
  });
});
