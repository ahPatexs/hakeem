/**
 * Preview E2E smoke against a deployed Vercel URL.
 * Usage: node scripts/preview-smoke.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? process.env.PLAYWRIGHT_BASE_URL ?? "https://hakeem-hicqufqt5-patexs.vercel.app";

const ACCOUNTS = {
  patient: { email: "patient@hakeem.local", password: "Patient!Pass1234", home: /\/en\/patient/ },
  doctor: { email: "doctor@hakeem.local", password: "Doctor!Pass1234", home: /\/en\/doctor/ },
  admin: { email: "admin@hakeem.local", password: "Admin!Pass1234", home: /\/en\/admin/ },
};

const ROUTES = {
  patient: [
    "/en/patient",
    "/en/patient/appointments",
    "/en/patient/appointments/book",
    "/en/patient/doctors",
    "/en/patient/records",
    "/en/patient/prescriptions",
    "/en/patient/labs",
    "/en/patient/medical-profile",
    "/en/patient/notifications",
    "/en/patient/profile",
    "/en/patient/settings",
    "/en/patient/ai",
    "/en/patient/ai/symptom-checker",
    "/en/patient/ai/health",
    "/en/patient/timeline",
  ],
  doctor: [
    "/en/doctor",
    "/en/doctor/appointments",
    "/en/doctor/queue",
    "/en/doctor/patients",
    "/en/doctor/prescriptions",
    "/en/doctor/labs",
    "/en/doctor/schedule",
    "/en/doctor/profile",
    "/en/doctor/settings",
    "/en/doctor/notifications",
    "/en/doctor/ai",
    "/en/doctor/ai/documentation",
    "/en/doctor/ai/prescription",
  ],
  admin: [
    "/en/admin",
    "/en/admin/users",
    "/en/admin/doctors",
    "/en/admin/appointments",
    "/en/admin/billing",
    "/en/admin/analytics",
    "/en/admin/audit",
    "/en/admin/settings",
    "/en/admin/roles",
    "/en/admin/health",
    "/en/admin/notifications",
    "/en/admin/emr",
    "/en/admin/ai",
    "/en/admin/ai/prompts",
    "/en/admin/ai/models",
    "/en/admin/ai/budgets",
    "/en/admin/ai/monitoring",
    "/en/admin/ai/usage",
  ],
};

const results = [];

function record(role, path, ok, detail = "") {
  results.push({ role, path, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  [${role}] ${path}${detail ? ` — ${detail}` : ""}`);
}

async function login(page, account) {
  await page.goto(`${BASE}/en/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator("#email").fill(account.email);
  await page.locator("#password").fill(account.password);
  await page.getByRole("button", { name: /sign in|تسجيل/i }).click();
  await page.waitForURL(account.home, { timeout: 45_000 });
}

async function checkRoutes(page, role, paths) {
  for (const path of paths) {
    try {
      const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const status = res?.status() ?? 0;
      const url = page.url();
      const body = await page.locator("body").innerText().catch(() => "");
      const crashed =
        /Application error|Internal Server Error|This page could not be found|Something went wrong/i.test(
          body,
        );
      const bouncedToLogin = /\/(en|ar)\/(login|unauthorized|session-expired)/.test(url);
      const ok = status < 400 && !crashed && !bouncedToLogin;
      record(
        role,
        path,
        ok,
        ok ? `HTTP ${status}` : `HTTP ${status}; url=${url}; crash=${crashed}; loginBounce=${bouncedToLogin}`,
      );
    } catch (err) {
      record(role, path, false, err.message);
    }
  }
}

async function exercisePatientAi(page) {
  try {
    await page.goto(`${BASE}/en/patient/ai`, { waitUntil: "networkidle", timeout: 60_000 });
    const composer = page.locator("textarea, input[type='text']").first();
    await composer.waitFor({ timeout: 20_000 });
    await composer.fill("I have a mild headache. What general self-care tips are safe?");
    const send = page.getByRole("button", { name: /send|submit|ask|chat/i }).first();
    if (await send.count()) {
      await send.click();
    } else {
      await composer.press("Enter");
    }
    await page.waitForTimeout(8_000);
    const body = await page.locator("body").innerText();
    const gotReply =
      body.length > 200 &&
      !/Application error|Internal Server Error/i.test(body);
    record("patient", "/en/patient/ai#chat", gotReply, gotReply ? "reply/UI responded" : "no usable reply");
  } catch (err) {
    record("patient", "/en/patient/ai#chat", false, err.message);
  }
}

async function exerciseSymptom(page) {
  try {
    await page.goto(`${BASE}/en/patient/ai/symptom-checker`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    const body = await page.locator("body").innerText();
    const ok = body.length > 40 && !/Application error|Internal Server Error/i.test(body);
    record("patient", "/en/patient/ai/symptom-checker#ui", ok, ok ? "UI rendered" : "empty/error");
  } catch (err) {
    record("patient", "/en/patient/ai/symptom-checker#ui", false, err.message);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();

console.log(`Base URL: ${BASE}\n`);

for (const [role, account] of Object.entries(ACCOUNTS)) {
  console.log(`\n=== ${role.toUpperCase()} ===`);
  try {
    await context.clearCookies();
    await login(page, account);
    record(role, "login", true, account.email);
    await checkRoutes(page, role, ROUTES[role]);
    if (role === "patient") {
      await exercisePatientAi(page);
      await exerciseSymptom(page);
    }
  } catch (err) {
    record(role, "login", false, err.message);
  }
}

await browser.close();

const failed = results.filter((r) => !r.ok);
const passed = results.filter((r) => r.ok);
console.log(`\n======== SUMMARY ========`);
console.log(`Passed: ${passed.length}`);
console.log(`Failed: ${failed.length}`);
if (failed.length) {
  console.log("\nFailures:");
  for (const f of failed) console.log(` - [${f.role}] ${f.path}: ${f.detail}`);
}
process.exit(failed.length ? 1 : 0);
