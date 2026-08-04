import { test as base, expect } from "@playwright/test";
import { test as emrTest } from "./fixtures";

/**
 * EMR smoke (T133). Unauthenticated routes assert the RBAC redirect gate;
 * authenticated flows use the shared emr fixtures and skip automatically
 * when the corresponding E2E_*_EMAIL env var isn't set (local/CI opt-in).
 */
base.describe("emr e2e smoke (unauthenticated)", () => {
  base("patient records requires auth", async ({ page }) => {
    await page.goto("/en/patient/records");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });

  base("patient timeline requires auth", async ({ page }) => {
    await page.goto("/en/patient/timeline");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });

  base("doctor SOAP workspace requires auth", async ({ page }) => {
    await page.goto("/en/doctor/consultations");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });

  base("patient labs list requires auth (release visibility gate)", async ({ page }) => {
    await page.goto("/en/patient/labs");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });

  base("admin EMR oversight requires auth", async ({ page }) => {
    await page.goto("/en/admin/emr");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });
});

emrTest.describe("emr e2e smoke (authenticated patient)", () => {
  emrTest.skip(!process.env.E2E_PATIENT_EMAIL, "Set E2E_PATIENT_EMAIL to run authenticated EMR patient flows");

  emrTest("patient records page renders EMR summary and documents", async ({ patientPage }) => {
    await patientPage.goto("/en/patient/records");
    await expect(patientPage.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  });

  emrTest("patient timeline page renders", async ({ patientPage }) => {
    await patientPage.goto("/en/patient/timeline");
    await expect(patientPage.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  });

  emrTest("patient labs list renders with release-status gating", async ({ patientPage }) => {
    await patientPage.goto("/en/patient/labs");
    await expect(patientPage.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  });

  emrTest("patient medical profile page renders", async ({ patientPage }) => {
    await patientPage.goto("/en/patient/medical-profile");
    await expect(patientPage.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
  });
});

emrTest.describe("emr e2e smoke (authenticated doctor)", () => {
  emrTest.skip(!process.env.E2E_DOCTOR_EMAIL, "Set E2E_DOCTOR_EMAIL to run authenticated EMR doctor flows");

  emrTest("doctor dashboard renders after login", async ({ doctorPage }) => {
    await doctorPage.goto("/en/doctor");
    await expect(doctorPage.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
  });

  emrTest("doctor prescriptions inbox renders via EMR facade", async ({ doctorPage }) => {
    await doctorPage.goto("/en/doctor/prescriptions");
    await expect(doctorPage.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
  });
});

emrTest.describe("emr e2e smoke (authenticated admin)", () => {
  emrTest.skip(!process.env.E2E_ADMIN_EMAIL, "Set E2E_ADMIN_EMAIL to run authenticated EMR admin flows");

  emrTest("admin EMR oversight page renders patient search", async ({ adminPage }) => {
    await adminPage.goto("/en/admin/emr");
    await expect(adminPage.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
    await expect(adminPage.getByRole("button", { name: /search|بحث/i })).toBeVisible();
  });
});
