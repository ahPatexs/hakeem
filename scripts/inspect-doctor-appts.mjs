import { chromium } from "@playwright/test";
const BASE = process.argv[2] ?? "https://hakeem-hicqufqt5-patexs.vercel.app";
const PATIENT = "cmseor1oy00049tpwregplsu2";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`${BASE}/en/login`);
await page.locator("#email").fill("doctor@hakeem.local");
await page.locator("#password").fill("Doctor!Pass1234");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/en\/doctor/);

for (const path of ["/en/doctor/queue", "/en/doctor/appointments", "/en/doctor/appointments/upcoming"]) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const hrefs = await page.$$eval("a[href]", (as) =>
    as.map((a) => a.getAttribute("href")).filter((h) => h && /appointment/i.test(h)),
  );
  console.log(path, "hrefs", [...new Set(hrefs)].slice(0, 15));
  console.log((await page.locator("body").innerText()).slice(0, 800).replace(/\s+/g, " "));
}

// Try documentation with patient + fake appointment from chart links
await page.goto(`${BASE}/en/doctor/patients/${PATIENT}`, { waitUntil: "networkidle" });
const all = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")).filter(Boolean));
console.log("chart hrefs", all.filter((h) => /appointment|consult|encounter|soap|workspace/i.test(h)).slice(0, 20));

await browser.close();