import { test, expect } from "./fixtures";

/**
 * DoD happy-path suite — uses admin auth fixture (seeded admin@hakeem.local).
 * See specs/005-admin-portal/quickstart.md
 */
test.describe("admin quickstart DoD", () => {
  test("dashboard KPIs render for admin", async ({ adminPage }) => {
    await adminPage.goto("/en/admin");
    await expect(adminPage.getByText(/patients|doctors|appointments|مرضى|أطباء/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("users and doctors management reachable", async ({ adminPage }) => {
    await adminPage.goto("/en/admin/users");
    await expect(adminPage.getByRole("heading").first()).toBeVisible({ timeout: 20_000 });
    await adminPage.goto("/en/admin/doctors");
    await expect(adminPage.getByRole("heading").first()).toBeVisible();
  });
});
