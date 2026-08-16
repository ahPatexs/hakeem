export type DoctorSearchProjection = {
  doctorId: string;
  nameEn: string;
  nameAr: string;
  specialtyKeys: string[];
  city: string | null;
  isBookable: boolean;
  isPublished: boolean;
  searchText: string;
  ratingAvg: number;
  ratingCount: number;
};

export type DoctorSearchHit = {
  doctorId: string;
  name: string;
  specialtyKeys: string[];
  city: string | null;
  isBookable: boolean;
  ratingAvg: number;
  ratingCount: number;
};

/** Max doctors returned per discovery query (perf cap). */
export const SEARCH_RESULT_LIMIT = 50;

export function normalizeSearchQuery(q?: string): string {
  return (q ?? "").trim().toLowerCase();
}

export function filterDiscoveryDoctors(
  doctors: DoctorSearchProjection[],
  opts?: { bookableOnly?: boolean; q?: string; specialty?: string; take?: number },
): DoctorSearchProjection[] {
  const take = Math.min(opts?.take ?? SEARCH_RESULT_LIMIT, SEARCH_RESULT_LIMIT);
  const q = normalizeSearchQuery(opts?.q);
  const specialty = opts?.specialty?.trim().toLowerCase();

  let rows = doctors.filter((d) => d.isPublished);
  if (opts?.bookableOnly) {
    rows = rows.filter((d) => d.isBookable);
  }
  if (specialty) {
    rows = rows.filter((d) => d.specialtyKeys.some((s) => s.toLowerCase() === specialty));
  }
  if (q) {
    rows = rows.filter((d) => d.searchText.includes(q));
  }
  rows.sort((a, b) => {
    if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
    if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
    return a.nameEn.localeCompare(b.nameEn);
  });
  return rows.slice(0, take);
}

export function buildSearchText(parts: string[]): string {
  return parts
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}
