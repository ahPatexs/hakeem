import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("care loop consult honesty", () => {
  test("checked-in visit remains on upcoming", async ({ page }) => {
    await login(page, "patient@hakeem.local", "Patient!Pass1234");
    await page.goto("/en/patient/appointments/upcoming");
    await expect(page.getByText(/checked in/i).first()).toBeVisible();
  });

  test("video waiting room labels demo when LiveKit is unset", async ({ page }) => {
    await login(page, "patient@hakeem.local", "Patient!Pass1234");
    await page.goto("/en/patient/appointments/upcoming");
    const join = page.getByRole("link", { name: /join video/i }).first();
    if (await join.count()) {
      await join.click();
      await expect(
        page.getByText(/demo room|demo video|labeled demo/i).first(),
      ).toBeVisible();
    }
  });
});
