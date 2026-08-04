import { describe, expect, it } from "vitest";
import { inChartSearch, EMR_SEARCH_PAGE_SIZE } from "@/lib/emr/search";
import { softDeleteWhere } from "@/domain/emr/soft-delete";
import { canPatientSeeLab } from "@/domain/emr/release";

/**
 * Lightweight integration-shaped checks without a live DB:
 * search + soft-delete + release compose safely for chart lists (T110).
 */
describe("emr chart list composition", () => {
  it("search pagination never exceeds page size 20", () => {
    const params = inChartSearch({ page: 3, q: "cbc" });
    expect(params.take).toBe(EMR_SEARCH_PAGE_SIZE);
    expect(params.skip).toBe(40);
  });

  it("default list filter excludes soft-deleted", () => {
    expect(softDeleteWhere()).toEqual({ deletedAt: null });
  });

  it("patient lab query path must filter by RELEASED", () => {
    expect(canPatientSeeLab("PENDING_REVIEW")).toBe(false);
    expect(["RELEASED"].every((s) => canPatientSeeLab(s as "RELEASED"))).toBe(true);
  });
});
