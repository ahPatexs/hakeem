import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "https://hakeem-hicqufqt5-patexs.vercel.app";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(`${BASE}/en/login`);
await page.locator("#email").fill("doctor@hakeem.local");
await page.locator("#password").fill("Doctor!Pass1234");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/en\/doctor/);

await page.goto(`${BASE}/en/doctor/patients`, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
console.log("PATIENTS BODY");
console.log((await page.locator("body").innerText()).slice(0, 1500));

const hrefs = await page.$$eval("a[href]", (as) =>
  as
    .map((a) => ({ href: a.getAttribute("href"), text: (a.textContent || "").trim() }))
    .filter((x) => x.href && /\/doctor\/patients\//.test(x.href)),
);
console.log("patient chart links", JSON.stringify(hrefs.slice(0, 10)));

if (hrefs[0]?.href) {
  await page.goto(new URL(hrefs[0].href, BASE).toString(), { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  console.log("CHART URL", page.url());
  console.log((await page.locator("body").innerText()).slice(0, 2000));
  const m = page.url().match(/\/doctor\/patients\/([^/?#]+)/);
  if (m) {
    const patientId = m[1];
    await page.goto(`${BASE}/en/doctor/ai/documentation?patient=${patientId}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    console.log("DOC URL", page.url());
    console.log((await page.locator("body").innerText()).slice(0, 2000));
    console.log("textareas", await page.locator("textarea").count());
  }
} else {
  console.log("No patient chart links found");
}
await browser.close();