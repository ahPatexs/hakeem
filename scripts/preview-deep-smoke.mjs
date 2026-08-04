import { chromium } from "@playwright/test";

const BASE =
  process.argv[2] ??
  process.env.PLAYWRIGHT_BASE_URL ??
  "https://hakeem-hicqufqt5-patexs.vercel.app";

const results = [];
function ok(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

async function login(email, password, home) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/en/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(home, { timeout: 45_000 });
}

await login("patient@hakeem.local", "Patient!Pass1234", /\/en\/patient/);

await page.goto(`${BASE}/en/patient/ai/symptom-checker`, { waitUntil: "domcontentloaded" });
const ta = page.locator("textarea").first();
await ta.click();
await ta.fill("");
await ta.pressSequentially("Mild sore throat for 2 days, no fever", { delay: 10 });
await page.getByRole("button", { name: /start check|start/i }).click({ timeout: 15_000 });
await page.waitForTimeout(5_000);
let body = await page.locator("body").innerText();
ok(
  "symptom start advances",
  /question|continue|answer|urgency|symptom|outcome|triage|seek|self/i.test(body) &&
    !/Application error/i.test(body),
  body.slice(0, 220).replace(/\s+/g, " "),
);

const ans = page.locator("textarea").first();
if (await ans.isVisible()) {
  await ans.click();
  await ans.pressSequentially("No fever, mild discomfort only", { delay: 10 });
  const cont = page.getByRole("button", { name: /continue|submit/i }).first();
  if (await cont.isEnabled()) {
    await cont.click();
    await page.waitForTimeout(6_000);
  }
}
body = await page.locator("body").innerText();
ok("symptom after answer", body.length > 80 && !/Application error/i.test(body));

await page.goto(`${BASE}/en/patient/doctors`, { waitUntil: "networkidle" });
body = await page.locator("body").innerText();
ok(
  "doctors directory",
  /Doctor|doctor@|specialty|book|profile/i.test(body),
  body.slice(0, 200).replace(/\s+/g, " "),
);

await page.goto(`${BASE}/en/patient/appointments/book`, { waitUntil: "networkidle" });
body = await page.locator("body").innerText();
ok("book appointment page", body.length > 40 && !/Application error/i.test(body));

await page.goto(`${BASE}/en/patient/payments`, { waitUntil: "domcontentloaded" });
body = await page.locator("body").innerText();
ok("payments page", body.length > 40 && !/Application error/i.test(body));

await login("doctor@hakeem.local", "Doctor!Pass1234", /\/en\/doctor/);
await page.goto(`${BASE}/en/doctor/ai/documentation`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1_500);
body = await page.locator("body").innerText();
ok("doctor documentation", !/Application error/i.test(body) && body.length > 40);
const dTa = page.locator("textarea").first();
if (await dTa.count()) {
  await dTa.click();
  await dTa.pressSequentially("Mild headache one day. No red flags. Afebrile.", { delay: 5 });
  const gen = page.getByRole("button", { name: /generate|draft|suggest|create|run|submit/i }).first();
  if ((await gen.count()) && (await gen.isEnabled())) {
    await gen.click();
    await page.waitForTimeout(8_000);
  }
  const after = await page.locator("body").innerText();
  ok("doctor draft interaction", after.length > 40);
} else {
  ok("doctor draft interaction", false, "no textarea");
}

await page.goto(`${BASE}/en/doctor/ai/prescription`, { waitUntil: "domcontentloaded" });
body = await page.locator("body").innerText();
ok("doctor rx AI", !/Application error/i.test(body) && body.length > 40);

await page.goto(`${BASE}/en/doctor/patients`, { waitUntil: "networkidle" });
body = await page.locator("body").innerText();
ok("doctor patients", !/Application error/i.test(body));

await login("admin@hakeem.local", "Admin!Pass1234", /\/en\/admin/);
for (const p of [
  "/en/admin/ai/prompts",
  "/en/admin/users",
  "/en/admin/health",
  "/en/admin/analytics",
  "/en/admin/settings",
]) {
  await page.goto(`${BASE}${p}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_200);
  body = await page.locator("body").innerText();
  const bounced = /\/(login|unauthorized)/.test(page.url());
  ok(
    `admin ${p}`,
    body.length > 40 && !/Application error|Internal Server Error/i.test(body) && !bounced,
  );
}

await page.goto(`${BASE}/en/admin/ai/prompts`);
await page.waitForTimeout(1_500);
const prompts = await page.locator("body").innerText();
ok(
  "admin prompts seeded content",
  /Patient|assistant|SYMPTOM|PROMPT|prompt|model/i.test(prompts),
);

console.log(`\nSUMMARY ${results.filter((r) => r.pass).length}/${results.length}`);
for (const r of results.filter((r) => !r.pass)) console.log("FAIL", r.name, r.detail);
await browser.close();
process.exit(results.some((r) => !r.pass) ? 1 : 0);
