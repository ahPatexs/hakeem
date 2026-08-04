import { chromium } from "@playwright/test";
const BASE = process.argv[2] ?? "https://hakeem-hicqufqt5-patexs.vercel.app";
const PATIENT = "cmseor1oy00049tpwregplsu2";
const APPT = "cmseoragm000p9tpw201zdfgs";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const results = [];
const ok = (n, p, d="") => { results.push({n,p,d}); console.log((p?"PASS":"FAIL")+" "+n+(d?" — "+d:"")); };

await page.goto(`${BASE}/en/login`);
await page.locator("#email").fill("doctor@hakeem.local");
await page.locator("#password").fill("Doctor!Pass1234");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/en\/doctor/);

await page.goto(`${BASE}/en/doctor/appointments/${APPT}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
let body = await page.locator("body").innerText();
ok("consultation workspace", body.length > 40 && !/Application error/i.test(body), page.url());
console.log(body.slice(0, 1200));
const buttons = await page.evaluate(() => [...document.querySelectorAll("button")].map(b=>b.innerText.trim()).filter(Boolean).slice(0,30));
console.log("buttons", buttons);
console.log("textareas", await page.locator("textarea").count());

await page.goto(`${BASE}/en/doctor/ai/documentation?patient=${PATIENT}&appointment=${APPT}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
body = await page.locator("body").innerText();
const taCount = await page.locator("textarea").count();
ok("documentation with context", taCount > 0 || /SOAP|draft|Generate|summary/i.test(body), `ta=${taCount}`);
console.log(body.slice(0, 1500));

if (taCount > 0) {
  const ta = page.locator("textarea").first();
  await ta.click();
  await ta.pressSequentially("Mild sore throat 2 days. No fever. Exam pending.", { delay: 5 });
  const gen = page.getByRole("button", { name: /generate|draft|create|run|submit/i }).first();
  if (await gen.count()) {
    await gen.click();
    await page.waitForTimeout(8000);
  }
  const after = await page.locator("body").innerText();
  ok("documentation generate", after.length > body.length || /subjective|objective|assessment|plan|SOAP|draft/i.test(after));
}

await page.goto(`${BASE}/en/doctor/ai/prescription?patient=${PATIENT}`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
body = await page.locator("body").innerText();
ok("rx with patient", await page.locator("textarea").count() > 0 || /suggest|medication|draft/i.test(body));
console.log(body.slice(0, 1000));

// CDS already seen on chart - reconfirm
await page.goto(`${BASE}/en/doctor/patients/${PATIENT}`, { waitUntil: "networkidle" });
body = await page.locator("body").innerText();
ok("CDS allergy insight", /Penicillin|Clinical decision support|ALLERGY/i.test(body));

console.log("SUMMARY", results.filter(r=>r.p).length+"/"+results.length);
await browser.close();
process.exit(results.some(r=>!r.p)?1:0);