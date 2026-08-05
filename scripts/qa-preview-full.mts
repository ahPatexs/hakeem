/**
 * Full-feature QA against a Vercel preview (or PLAYWRIGHT_BASE_URL).
 * Creates new patient (register UI) + doctor (admin provision via DB, no public doctor register),
 * then probes every major route and key flows.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/qa-preview-full.mts
 */
import { chromium, type Page } from "playwright";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { writeFileSync } from "node:fs";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://hakeem-hicqufqt5-patexs.vercel.app";
const stamp = Date.now().toString(36);
const PATIENT_EMAIL = `qa.patient.${stamp}@hakeem.test`;
const DOCTOR_EMAIL = `qa.doctor.${stamp}@hakeem.test`;
const PASSWORD = "QaTest!Pass1234";
const ADMIN_EMAIL = "admin@hakeem.local";
const ADMIN_PASSWORD = "Admin!Pass1234";

type Status = "ok" | "fail" | "partial" | "skip";
type Result = { feature: string; status: Status; detail: string };

const results: Result[] = [];
const prisma = new PrismaClient();

function record(feature: string, status: Status, detail: string) {
  results.push({ feature, status, detail });
  const icon = status === "ok" ? "OK" : status === "fail" ? "FAIL" : status.toUpperCase();
  console.log(`[${icon}] ${feature}: ${detail}`);
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/en/login`, { waitUntil: "networkidle", timeout: 90000 });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => {
    const u = location.pathname;
    return /\/(patient|doctor|admin)(\/|$)/.test(u) || document.body.innerText.match(/invalid|locked|error|not verified|denied/i);
  }, { timeout: 90000 });
  await page.waitForTimeout(1000);
}

async function probe(
  page: Page,
  feature: string,
  path: string,
  expectOk: RegExp | string,
  failIf?: RegExp,
) {
  try {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const status = res?.status() ?? 0;
    const body = await page.content();
    const text = await page.locator("body").innerText().catch(() => "");
    if (/Sign in required|You need to sign in to continue/i.test(text) && !path.includes("/login") && !path.includes("/register")) {
      record(feature, "fail", `Unauthenticated wall at ${path}`);
      return;
    }
    if (status >= 500 || /Internal Server Error|Application error|Could not find the module/i.test(body)) {
      record(feature, "fail", `HTTP ${status} server error at ${path}`);
      return;
    }
    if (failIf && failIf.test(text)) {
      record(feature, "fail", `Matched fail pattern at ${path}: ${text.slice(0, 120)}`);
      return;
    }
    if (typeof expectOk === "string" ? text.includes(expectOk) || page.url().includes(expectOk) : expectOk.test(text) || expectOk.test(page.url())) {
      record(feature, "ok", `${path} (${status})`);
    } else if (/unauthorized|sign in required|Sign in/i.test(text) && !path.includes("login")) {
      record(feature, "fail", `Auth blocked unexpectedly at ${path}`);
    } else {
      record(feature, "partial", `${path} loaded (${status}) but expected content unclear: ${text.slice(0, 100).replace(/\s+/g, " ")}`);
    }
  } catch (e) {
    record(feature, "fail", `${path}: ${(e as Error).message}`);
  }
}

async function activatePatient(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Patient not found in DB: ${email}`);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "ACTIVE",
      emailVerified: new Date(),
    },
  });
  await prisma.portalSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, locale: "EN" },
  });
}

async function provisionDoctor(email: string, name: string, password: string) {
  const passwordHash = await hash(password, 12);
  const specialty =
    (await prisma.specialty.findFirst({ orderBy: { sortOrder: "asc" } })) ??
    (await prisma.specialty.create({
      data: { slug: "general-qa", nameEn: "General", nameAr: "عام", sortOrder: 0 },
    }));

  const baseSlug = `dr-qa-${stamp}`;
  const doctor = await prisma.doctor.create({
    data: {
      slug: baseSlug,
      status: "PUBLISHED",
      nameEn: name,
      nameAr: name,
      specialtyId: specialty.id,
      bioEn: "QA test doctor",
      bioAr: "طبيب اختبار",
      isAvailable: true,
      publishedAt: new Date(),
    },
  });

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: "DOCTOR",
      status: "ACTIVE",
      emailVerified: new Date(),
      doctorProfileId: doctor.id,
      doctorApproval: "APPROVED",
    },
  });
  await prisma.portalSettings.create({ data: { userId: user.id, locale: "EN" } }).catch(() => undefined);
  return { userId: user.id, doctorId: doctor.id, slug: doctor.slug };
}

async function main() {
  console.log(`BASE=${BASE}`);
  console.log(`Patient=${PATIENT_EMAIL}`);
  console.log(`Doctor=${DOCTOR_EMAIL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    locale: "en-US",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);

  // --- Public ---
  await probe(page, "Public home", "/en", /Hakeem|Get started|Sign in|Patient/i);
  await probe(page, "Public login page", "/en/login", /Sign in|Email|Password/i);
  await probe(page, "Public register page", "/en/register", /Create|Register|Email|Password|name/i);

  // --- Register patient ---
  try {
    await page.goto(`${BASE}/en/register`, { waitUntil: "domcontentloaded" });
    await page.fill("#name", `QA Patient ${stamp}`);
    await page.fill("#email", PATIENT_EMAIL);
    await page.fill("#password", PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/verify-email/, { timeout: 60000 });
    record("Patient register", "ok", `Reached verify-email for ${PATIENT_EMAIL}`);
  } catch (e) {
    record("Patient register", "fail", (e as Error).message);
  }

  // Email is console-only on preview — activate via Neon (same DB as Preview)
  try {
    await activatePatient(PATIENT_EMAIL);
    record("Patient email verify (DB activate)", "ok", "Status ACTIVE + emailVerified (no Resend inbox on Preview)");
  } catch (e) {
    record("Patient email verify (DB activate)", "fail", (e as Error).message);
  }

  // --- Doctor: no public register — provision approved doctor ---
  let doctorSlug = "";
  try {
    const doc = await provisionDoctor(DOCTOR_EMAIL, `QA Doctor ${stamp}`, PASSWORD);
    doctorSlug = doc.slug;
    record(
      "Doctor provision (admin-style)",
      "ok",
      `No public doctor register — created APPROVED doctor ${DOCTOR_EMAIL} slug=${doc.slug}`,
    );
  } catch (e) {
    record("Doctor provision (admin-style)", "fail", (e as Error).message);
  }

  // --- Patient login + features ---
  try {
    await login(page, PATIENT_EMAIL, PASSWORD);
    if (page.url().includes("/patient")) {
      record("Patient login", "ok", page.url());
    } else {
      record("Patient login", "fail", `Landed on ${page.url()}`);
    }
  } catch (e) {
    record("Patient login", "fail", (e as Error).message);
  }

  const patientRoutes: [string, string, RegExp][] = [
    ["Patient dashboard", "/en/patient", /./],
    ["Patient settings", "/en/patient/settings", /./],
    ["Patient profile", "/en/patient/profile", /./],
    ["Medical profile", "/en/patient/medical-profile", /./],
    ["Doctors list", "/en/patient/doctors", /./],
    ["Book entry", "/en/patient/appointments/book", /./],
    ["Appointments", "/en/patient/appointments", /./],
    ["Upcoming appointments", "/en/patient/appointments/upcoming", /./],
    ["History appointments", "/en/patient/appointments/history", /./],
    ["Records", "/en/patient/records", /./],
    ["Labs", "/en/patient/labs", /./],
    ["Prescriptions", "/en/patient/prescriptions", /./],
    ["Payments", "/en/patient/payments", /./],
    ["Notifications", "/en/patient/notifications", /./],
    ["Timeline", "/en/patient/timeline", /./],
    ["AI assistant", "/en/patient/ai", /./],
    ["AI health", "/en/patient/ai/health", /./],
    ["Symptom checker", "/en/patient/ai/symptom-checker", /./],
  ];
  for (const [name, path, re] of patientRoutes) {
    await probe(page, name, path, re, /Internal Server Error/i);
  }

  // Book with new doctor if available
  if (doctorSlug) {
    try {
      await page.goto(`${BASE}/en/patient/doctors/${doctorSlug}`, { waitUntil: "domcontentloaded" });
      const bookBtn = page.getByRole("button", { name: /book|حجز/i }).first();
      // Select first availability slot then book
      const slotButtons = page.locator("section button").filter({ hasNotText: /in person|video|book|booking|حجز/i });
      const slotCount = await slotButtons.count();
      if (slotCount > 0) {
        await slotButtons.first().click();
        await page.waitForTimeout(300);
      }
      if (await bookBtn.count()) {
        await bookBtn.click();
        await page.waitForURL(/\/patient\/appointments\//, { timeout: 30000 }).catch(() => undefined);
        await page.waitForTimeout(1500);
        const url = page.url();
        const text = await page.locator("body").innerText();
        if (/\/patient\/appointments\//.test(url)) {
          record("Patient book appointment", "ok", `Booked → ${url}`);
        } else if (/error|fail|unavailable|no slot/i.test(text)) {
          record("Patient book appointment", "fail", text.slice(0, 180).replace(/\s+/g, " "));
        } else {
          record("Patient book appointment", "partial", `slots=${slotCount}; url=${url}; ${text.slice(0, 120)}`);
        }
      } else {
        record("Patient book appointment", "partial", "Doctor page loaded but no Book button (availability/UI)");
      }
    } catch (e) {
      record("Patient book appointment", "fail", (e as Error).message);
    }
  } else {
    record("Patient book appointment", "skip", "No doctor slug");
  }

  // AI chat smoke
  try {
    await page.goto(`${BASE}/en/patient/ai`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    if (/Sign in required/i.test(await page.locator("body").innerText())) {
      record("Patient AI chat send", "fail", "Not authenticated");
    } else {
      const input = page.locator("form input, form textarea").first();
      await input.waitFor({ timeout: 15000 });
      await input.fill("I have a mild headache for one day");
      await page.locator("form button[type='submit']").first().click();
      await page.waitForTimeout(6000);
      const text = await page.locator("body").innerText();
      const bad = /Internal Server Error|Could not find the module/i.test(text);
      const useful = /disclaimer|assistant|headache|care|doctor|Hakeem|AI/i.test(text);
      record("Patient AI chat send", bad ? "fail" : useful ? "ok" : "partial", text.slice(0, 220).replace(/\s+/g, " "));
    }
  } catch (e) {
    record("Patient AI chat send", "fail", (e as Error).message);
  }

  // Symptom checker start
  try {
    await page.goto(`${BASE}/en/patient/ai/symptom-checker`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    if (/Sign in required/i.test(await page.locator("body").innerText())) {
      record("Patient symptom checker", "fail", "Not authenticated");
    } else {
      const complaint = page.locator("textarea").first();
      await complaint.waitFor({ timeout: 15000 });
      await complaint.fill("Mild sore throat for two days, no fever");
      await page.locator("form button[type='submit']").first().click();
      await page.waitForTimeout(5000);
      const text = await page.locator("body").innerText();
      record("Patient symptom checker", /Internal Server Error/i.test(text) ? "fail" : "ok", text.slice(0, 180).replace(/\s+/g, " "));
    }
  } catch (e) {
    record("Patient symptom checker", "fail", (e as Error).message);
  }

  // Settings save smoke
  try {
    await page.goto(`${BASE}/en/patient/settings`, { waitUntil: "domcontentloaded" });
    const text = await page.locator("body").innerText();
    record("Patient settings content", /settings|language|notification|privacy|consent|locale/i.test(text) ? "ok" : "partial", text.slice(0, 140).replace(/\s+/g, " "));
  } catch (e) {
    record("Patient settings content", "fail", (e as Error).message);
  }

  // Logout if available
  await page.goto(`${BASE}/en/patient`, { waitUntil: "domcontentloaded" }).catch(() => undefined);
  const logout = page.getByRole("button", { name: /log ?out|sign ?out|خروج/i }).or(page.getByRole("link", { name: /log ?out|sign ?out|خروج/i }));
  if (await logout.count()) {
    await logout.first().click().catch(() => undefined);
    await page.waitForTimeout(1000);
  }
  // Clear cookies to switch role
  await context.clearCookies();

  // --- Doctor login + features ---
  try {
    await login(page, DOCTOR_EMAIL, PASSWORD);
    if (page.url().includes("/doctor")) {
      record("Doctor login", "ok", page.url());
    } else {
      record("Doctor login", "fail", `Landed on ${page.url()} — body: ${(await page.locator("body").innerText()).slice(0, 120)}`);
    }
  } catch (e) {
    record("Doctor login", "fail", (e as Error).message);
  }

  const doctorRoutes: [string, string][] = [
    ["Doctor dashboard", "/en/doctor"],
    ["Doctor schedule", "/en/doctor/schedule"],
    ["Doctor queue", "/en/doctor/queue"],
    ["Doctor appointments", "/en/doctor/appointments"],
    ["Doctor patients", "/en/doctor/patients"],
    ["Doctor prescriptions", "/en/doctor/prescriptions"],
    ["Doctor labs", "/en/doctor/labs"],
    ["Doctor AI", "/en/doctor/ai"],
    ["Doctor AI documentation", "/en/doctor/ai/documentation"],
    ["Doctor AI prescription", "/en/doctor/ai/prescription"],
    ["Doctor profile", "/en/doctor/profile"],
    ["Doctor settings", "/en/doctor/settings"],
    ["Doctor notifications", "/en/doctor/notifications"],
  ];
  for (const [name, path] of doctorRoutes) {
    await probe(page, name, path, /./, /Internal Server Error/i);
  }

  await context.clearCookies();

  // --- Admin smoke (seeded) ---
  try {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    if (page.url().includes("/admin")) {
      record("Admin login (seed)", "ok", page.url());
    } else {
      record("Admin login (seed)", "fail", `Landed on ${page.url()}`);
    }
  } catch (e) {
    record("Admin login (seed)", "fail", (e as Error).message);
  }

  const adminRoutes: [string, string][] = [
    ["Admin dashboard", "/en/admin"],
    ["Admin users", "/en/admin/users"],
    ["Admin doctors", "/en/admin/doctors"],
    ["Admin AI", "/en/admin/ai"],
    ["Admin AI prompts", "/en/admin/ai/prompts"],
    ["Admin AI models", "/en/admin/ai/models"],
    ["Admin AI budgets", "/en/admin/ai/budgets"],
  ];
  for (const [name, path] of adminRoutes) {
    await probe(page, name, path, /./, /Internal Server Error/i);
  }

  // RBAC: patient cannot open admin
  await context.clearCookies();
  try {
    await login(page, PATIENT_EMAIL, PASSWORD);
    await page.goto(`${BASE}/en/admin`, { waitUntil: "domcontentloaded" });
    const text = await page.locator("body").innerText();
    const denied = /unauthorized|denied|sign in|access/i.test(text) || !page.url().includes("/admin") || page.url().includes("unauthorized");
    record("RBAC patient→admin denied", denied ? "ok" : "fail", page.url());
  } catch (e) {
    record("RBAC patient→admin denied", "fail", (e as Error).message);
  }

  await browser.close();
  await prisma.$disconnect();

  const summary = {
    base: BASE,
    accounts: {
      patient: { email: PATIENT_EMAIL, password: PASSWORD },
      doctor: { email: DOCTOR_EMAIL, password: PASSWORD, note: "Provisioned APPROVED (no public doctor register)" },
      adminSeed: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    },
    counts: {
      ok: results.filter((r) => r.status === "ok").length,
      fail: results.filter((r) => r.status === "fail").length,
      partial: results.filter((r) => r.status === "partial").length,
      skip: results.filter((r) => r.status === "skip").length,
    },
    results,
  };
  writeFileSync("scripts/qa-preview-report.json", JSON.stringify(summary, null, 2));
  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(summary.counts, null, 2));
  console.log("\n=== NEW ACCOUNTS ===");
  console.log(JSON.stringify(summary.accounts, null, 2));
  console.log("\nReport: scripts/qa-preview-report.json");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
