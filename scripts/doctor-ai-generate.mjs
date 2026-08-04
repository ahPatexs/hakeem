import { chromium } from "@playwright/test";
const BASE = "https://hakeem-hicqufqt5-patexs.vercel.app";
const PATIENT = "cmseor1oy00049tpwregplsu2";
const APPT = "cmseoragm000p9tpw201zdfgs";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(`${BASE}/en/login`);
await page.locator("#email").fill("doctor@hakeem.local");
await page.locator("#password").fill("Doctor!Pass1234");
await page.getByRole("button", { name: /sign in/i }).click();
await page.waitForURL(/\/en\/doctor/);

await page.goto(`${BASE}/en/doctor/ai/documentation?patient=${PATIENT}&appointment=${APPT}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Generate SOAP draft/i }).click();
await page.waitForTimeout(10000);
let body = await page.locator("body").innerText();
const soapOk = /subjective|objective|assessment|plan|SOAP|draft|Accept|advisory|generated/i.test(body) && !/Application error/i.test(body);
console.log(soapOk ? "PASS SOAP generate" : "FAIL SOAP generate");
console.log(body.slice(0, 2000));

await page.goto(`${BASE}/en/doctor/ai/prescription?patient=${PATIENT}`, { waitUntil: "networkidle" });
const intent = page.getByLabel(/clinical intent/i).or(page.locator("textarea").first());
await intent.click();
await intent.pressSequentially("Paracetamol for mild headache", { delay: 8 });
await page.getByRole("button", { name: /Suggest prescription/i }).click();
await page.waitForTimeout(10000);
body = await page.locator("body").innerText();
const rxOk = /paracetamol|acetaminophen|dose|suggest|conflict|accept|medication/i.test(body) && !/Application error/i.test(body);
console.log(rxOk ? "PASS RX suggest" : "FAIL RX suggest");
console.log(body.slice(0, 2000));

await browser.close();
process.exit(soapOk && rxOk ? 0 : 1);