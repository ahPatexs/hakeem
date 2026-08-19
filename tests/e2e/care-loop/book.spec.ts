import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/en/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
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
    const logs: string[] = [];
    page.on("console", (msg) => logs.push(`console:${msg.type()}:${msg.text()}`));
    page.on("pageerror", (err) => logs.push(`pageerror:${err.message}`));
    page.on("response", async (res) => {
      const url = res.url();
      if (res.request().method() !== "POST") return;
      const action = res.request().headers()["next-action"];
      if (!action && !url.includes("doctors") && !url.includes("login")) return;
      let body = "";
      try {
        body = (await res.text()).slice(0, 500);
      } catch {
        body = "<unreadable>";
      }
      logs.push(`post:${res.status()}:${url.slice(0, 120)}:${body}`);
    });
    const email = process.env.PLAYWRIGHT_PATIENT_EMAIL ?? "ahelal@patexs.com";
    const password = process.env.PLAYWRIGHT_PATIENT_PASSWORD ?? "Patexs!Pass1234";
    await login(page, email, password);
    await expect(page).not.toHaveURL(/\/login/i, { timeout: 30_000 });
    await page.goto("/en/patient/doctors/alaa-helal");
    await expect(page.getByRole("heading", { name: /alaa helal/i })).toBeVisible({ timeout: 30_000 });

    const openSlot = page.locator("aside button:not([disabled])").filter({ hasText: /^11:00$/ }).first();
    await expect(openSlot).toBeVisible({ timeout: 30_000 });
    await openSlot.click();
    await expect(page.getByText(/11:00 · Video/i)).toBeVisible();

    await expect(page.getByRole("button", { name: /book this time/i })).toBeEnabled();
    await page.getByRole("button", { name: /book this time/i }).click();
    try {
      await expect(page).toHaveURL(/\/patient\/appointments\/[^/]+/i, { timeout: 60_000 });
    } catch (error) {
      const message = await page.locator("p[role='alert']").innerText().catch(() => page.url());
      throw new Error(`Booking did not complete: ${message}\n${logs.join("\n")}`, { cause: error });
    }
  });
});
