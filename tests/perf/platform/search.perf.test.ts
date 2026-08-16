import { describe, expect, it } from "vitest";
import { SEARCH_RESULT_LIMIT, filterDiscoveryDoctors } from "@/domain/platform/search";

describe("doctor search query cap", () => {
  it("take limit is at most 50", () => {
    expect(SEARCH_RESULT_LIMIT).toBeLessThanOrEqual(50);
  });

  it("never returns more than cap even with higher take request", () => {
    const rows = Array.from({ length: 100 }, (_, i) => ({
      doctorId: `d${i}`,
      nameEn: "Doc",
      nameAr: "طبيب",
      specialtyKeys: ["general"],
      city: null,
      isBookable: true,
      isPublished: true,
      searchText: "doc طبيب general",
      ratingAvg: 0,
      ratingCount: 0,
    }));
    expect(filterDiscoveryDoctors(rows, { take: 999 }).length).toBeLessThanOrEqual(50);
  });
});
