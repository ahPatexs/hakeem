import { test as base, expect } from "@playwright/test";
import { test as emrTest } from "../emr/fixtures";

/**
 * AI Module 7 smoke (T076). Unauthenticated routes assert the RBAC redirect gate;
 * authenticated flows reuse EMR fixtures and skip when E2E_* env vars are missing.
 */
base.describe("ai e2e smoke (unauthenticated)", () => {
  base("patient AI chat requires auth", async ({ page }) => {
    await page.goto("/en/patient/ai");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });

  base("patient symptom checker requires auth", async ({ page }) => {
    await page.goto("/en/patient/ai/symptom-checker");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });

  base("patient health education requires auth", async ({ page }) => {
    await page.goto("/en/patient/ai/health");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });

  base("admin AI dashboard requires auth", async ({ page }) => {
    await page.goto("/en/admin/ai");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });

  base("admin AI prompts requires auth", async ({ page }) => {
    await page.goto("/en/admin/ai/prompts");
    await expect(page).toHaveURL(/unauthorized|login|session-expired/);
  });
});

emrTest.describe("ai e2e smoke (authenticated patient)", () => {
  emrTest.skip(
    !process.env.E2E_PATIENT_EMAIL,
    "Set E2E_PATIENT_EMAIL to run authenticated AI patient flows",
  );

  emrTest("patient AI chat page renders", async ({ patientPage }) => {
    await patientPage.goto("/en/patient/ai");
    await expect(patientPage.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
  });

  emrTest("patient symptom checker page renders", async ({ patientPage }) => {
    await patientPage.goto("/en/patient/ai/symptom-checker");
    await expect(patientPage.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
  });

  emrTest("patient health education page renders", async ({ patientPage }) => {
    await patientPage.goto("/en/patient/ai/health");
    await expect(patientPage.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
  });
});

emrTest.describe("ai e2e smoke (authenticated doctor)", () => {
  emrTest.skip(
    !process.env.E2E_DOCTOR_EMAIL,
    "Set E2E_DOCTOR_EMAIL to run authenticated AI doctor flows",
  );

  emrTest("doctor dashboard reachable for draft-panel hosts", async ({ doctorPage }) => {
    await doctorPage.goto("/en/doctor");
    await expect(doctorPage.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
  });
});

emrTest.describe("ai e2e smoke (authenticated admin)", () => {
  emrTest.skip(
    !process.env.E2E_ADMIN_EMAIL,
    "Set E2E_ADMIN_EMAIL to run authenticated AI admin flows",
  );

  emrTest("admin AI dashboard renders", async ({ adminPage }) => {
    await adminPage.goto("/en/admin/ai");
    await expect(adminPage.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
  });

  emrTest("admin AI prompts page renders", async ({ adminPage }) => {
    await adminPage.goto("/en/admin/ai/prompts");
    await expect(adminPage.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
  });
});
