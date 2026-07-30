import { describe, expect, it } from "vitest";
import { filterDiscoveryDoctors, SEARCH_RESULT_LIMIT } from "@/domain/platform/search";

const doctors = [
  {
    doctorId: "d1",
    nameEn: "A",
    nameAr: "أ",
    specialtyKeys: ["cardiology"],
    city: "Riyadh",
    isBookable: true,
    isPublished: true,
    searchText: "a cardiology riyadh",
  },
  {
    doctorId: "d2",
    nameEn: "B",
    nameAr: "ب",
    specialtyKeys: ["dermatology"],
    city: "Jeddah",
    isBookable: false,
    isPublished: true,
    searchText: "b dermatology jeddah",
  },
  {
    doctorId: "d3",
    nameEn: "C",
    nameAr: "ج",
    specialtyKeys: ["cardiology"],
    city: "Riyadh",
    isBookable: true,
    isPublished: false,
    searchText: "c cardiology riyadh",
  },
];

describe("doctor discovery bookable filter", () => {
  it("excludes unpublished doctors", () => {
    const all = filterDiscoveryDoctors(doctors);
    expect(all.map((d) => d.doctorId)).toEqual(["d1", "d2"]);
  });

  it("filters bookable-only at query time", () => {
    const bookable = filterDiscoveryDoctors(doctors, { bookableOnly: true });
    expect(bookable).toHaveLength(1);
    expect(bookable[0]?.doctorId).toBe("d1");
  });

  it("caps results at SEARCH_RESULT_LIMIT", () => {
    expect(SEARCH_RESULT_LIMIT).toBeLessThanOrEqual(50);
    const many = Array.from({ length: 60 }, (_, i) => ({
      doctorId: `d${i}`,
      nameEn: "X",
      nameAr: "س",
      specialtyKeys: [] as string[],
      city: null,
      isBookable: true,
      isPublished: true,
      searchText: "x",
    }));
    expect(filterDiscoveryDoctors(many)).toHaveLength(50);
  });
});
