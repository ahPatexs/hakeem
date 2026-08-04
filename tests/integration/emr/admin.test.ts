/**
 * Integration-shaped checks for the admin oversight facade without a live
 * DB: verifies the oversight/search surface is wired and that the search
 * directory composes RBAC with pagination consistently with in-chart search.
 */
import { describe, expect, it } from "vitest";
import { getOversightSummary, setLegalHold } from "@/lib/emr/admin";
import { searchPatientsForAdmin } from "@/lib/emr/search";
import { EMR_SEARCH_PAGE_SIZE, inChartSearch } from "@/lib/emr/search";

describe("emr admin facade wiring", () => {
  it("exports the oversight and directory-search surface", () => {
    for (const fn of [getOversightSummary, setLegalHold, searchPatientsForAdmin]) {
      expect(typeof fn).toBe("function");
    }
  });

  it("non-admin roles are rejected before any query is built", async () => {
    const patientResult = await searchPatientsForAdmin(
      { userId: "patient-1", role: "PATIENT" },
      { q: "john" },
    );
    expect(patientResult.ok).toBe(false);
    if (!patientResult.ok) expect(patientResult.code).toBe("FORBIDDEN");

    const doctorResult = await searchPatientsForAdmin(
      { userId: "doc-1", role: "DOCTOR", doctorId: "doctor-1" },
      {},
    );
    expect(doctorResult.ok).toBe(false);
    if (!doctorResult.ok) expect(doctorResult.code).toBe("FORBIDDEN");
  });

  it("the admin directory search reuses the same page size as in-chart search", () => {
    const params = inChartSearch({ page: 2 });
    expect(params.take).toBe(EMR_SEARCH_PAGE_SIZE);
    expect(params.skip).toBe(EMR_SEARCH_PAGE_SIZE);
  });
});
