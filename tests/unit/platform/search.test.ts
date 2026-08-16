import { describe, expect, it } from "vitest";
import { filterDiscoveryDoctors, SEARCH_RESULT_LIMIT } from "@/domain/platform/search";
import {
  aggregateRatingScores,
  canRateAppointmentStatus,
  compareByRatingThenName,
  isValidRatingScore,
} from "@/domain/patient/appointments";

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
    ratingAvg: 4.2,
    ratingCount: 3,
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
    ratingAvg: 5,
    ratingCount: 8,
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
    ratingAvg: 0,
    ratingCount: 0,
  },
];

describe("doctor discovery bookable filter", () => {
  it("excludes unpublished doctors", () => {
    const all = filterDiscoveryDoctors(doctors);
    expect(all.map((d) => d.doctorId)).toEqual(["d2", "d1"]);
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
      ratingAvg: 0,
      ratingCount: 0,
    }));
    expect(filterDiscoveryDoctors(many)).toHaveLength(50);
  });
});

describe("doctor ratings", () => {
  it("accepts integer scores 1-5 only", () => {
    expect(isValidRatingScore(1)).toBe(true);
    expect(isValidRatingScore(5)).toBe(true);
    expect(isValidRatingScore(0)).toBe(false);
    expect(isValidRatingScore(6)).toBe(false);
    expect(isValidRatingScore(4.5)).toBe(false);
  });

  it("allows rating only after a completed visit", () => {
    expect(canRateAppointmentStatus("COMPLETED")).toBe(true);
    expect(canRateAppointmentStatus("CONFIRMED")).toBe(false);
  });

  it("averages scores to one decimal", () => {
    expect(aggregateRatingScores([5, 4, 5])).toEqual({ avg: 4.7, count: 3 });
  });

  it("sorts higher average first, then more reviews", () => {
    const rows = [
      { nameEn: "B", ratingAvg: 4.5, ratingCount: 2 },
      { nameEn: "A", ratingAvg: 4.5, ratingCount: 10 },
      { nameEn: "C", ratingAvg: 5, ratingCount: 1 },
    ];
    rows.sort(compareByRatingThenName);
    expect(rows.map((r) => r.nameEn)).toEqual(["C", "A", "B"]);
  });
});
