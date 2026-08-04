import { describe, expect, it } from "vitest";
import { EMR_SEARCH_PAGE_SIZE, inChartSearch } from "@/lib/emr/search";

describe("emr inChartSearch", () => {
  it("normalizes page size to 20 and computes skip", () => {
    const result = inChartSearch({ q: " lab ", page: 2, type: "LAB" });
    expect(result.q).toBe("lab");
    expect(result.type).toBe("LAB");
    expect(result.page).toBe(2);
    expect(result.take).toBe(EMR_SEARCH_PAGE_SIZE);
    expect(result.skip).toBe(EMR_SEARCH_PAGE_SIZE);
  });

  it("defaults to page 1 when page omitted", () => {
    const result = inChartSearch({});
    expect(result.page).toBe(1);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });
});
